"""
pro_notifier.py

Sends Pipeline land use intelligence digests to active pro subscribers.
Each digest is filtered to the agent's coverage area and enriched with
one-sentence Claude market impact framing per event.

Usage:
  python pro_notifier.py                    # weekly digests (all due accounts)
  python pro_notifier.py --daily            # daily digests
  python pro_notifier.py --test EMAIL       # test send to EMAIL
  python pro_notifier.py --dry-run          # print without sending

Env vars:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  RESEND_API_KEY
  ANTHROPIC_API_KEY         (optional — impact framing disabled without it)
  PRO_EMAIL_FROM            (default: Pipeline <alerts@landusealert.com>)
  NEXT_PUBLIC_SITE_URL      (default: https://www.landusealert.com)
"""

import os
import sys
import json
import math
import argparse
from datetime import datetime, timedelta, date
from urllib.request import Request, urlopen
from urllib.error import HTTPError

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
RESEND_KEY = os.environ["RESEND_API_KEY"]
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY")
FROM_EMAIL = os.environ.get("PRO_EMAIL_FROM", "Pipeline <alerts@landusealert.com>")
SITE = os.environ.get("NEXT_PUBLIC_SITE_URL", "https://www.landusealert.com")


# ── Supabase helpers ──────────────────────────────────────────────────────

def sb_get(path, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}{params}"
    req = Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    with urlopen(req) as r:
        return json.loads(r.read())

def sb_patch(path, data, filters=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}{filters}"
    body = json.dumps(data).encode()
    req = Request(url, data=body, method="PATCH", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    with urlopen(req) as r:
        return r.status


# ── Geography ─────────────────────────────────────────────────────────────

def haversine_miles(lat1, lng1, lat2, lng2):
    """Distance in miles between two lat/lng points."""
    R = 3958.8
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def card_in_coverage(card, coverage_zones):
    """
    Returns True if the card falls within any of the agent's coverage zones.
    Falls through (returns True) if card has no geocode or agent has no coverage —
    better to over-deliver than silently drop events.
    """
    if not coverage_zones:
        return True  # no filter configured → send everything from subscribed townships

    card_lat = card.get("lat")
    card_lng = card.get("lng")
    card_zip = card.get("zip_code")

    if card_lat is None and card_zip is None:
        return True  # ungeooded card → include (don't silently drop)

    for zone in coverage_zones:
        # Radius check
        if zone.get("center_lat") and card_lat is not None:
            dist = haversine_miles(
                float(zone["center_lat"]), float(zone["center_lng"]),
                float(card_lat), float(card_lng)
            )
            if dist <= float(zone.get("radius_miles", 15)):
                return True
        # ZIP check
        zips = zone.get("zip_codes") or []
        if zips and card_zip and card_zip in zips:
            return True

    return False


# ── Claude impact framing ─────────────────────────────────────────────────

IMPACT_SYSTEM = """You are a real estate market intelligence analyst writing brief, actionable signals for NJ real estate agents, developers, and investors.

Given a municipal land use event, write ONE sentence that explains what this means for the local real estate market. Be specific and concrete. Start with what changed, end with the market implication.

Good examples:
- "An 84-unit multifamily approval near Route 70 adds rental supply to an area with limited inventory, likely absorbing buyer demand over the next 18 months."
- "A zoning variance for increased building height on this parcel could signal upzone pressure spreading from the Route 9 corridor."
- "A stop-work order on this approved subdivision delays 32 units from the pipeline, tightening near-term inventory in the 08527 market."

Bad examples (too generic):
- "This may affect local real estate."
- "Buyers and sellers should be aware of this development."

One sentence only. No hedging. No "it could potentially maybe." If the event is routine or unlikely to affect the market, say so in one sentence."""

def get_impact_framing(card):
    """Call Claude Haiku to get a one-sentence market impact for a card."""
    if not ANTHROPIC_KEY:
        return None

    outcome_map = {
        "approved": "APPROVED",
        "denied": "DENIED",
        "deferred": "DEFERRED — decision delayed",
        "pending": "PENDING — hearing scheduled or active",
        "introduced": "INTRODUCED — new filing",
        "discussed": "DISCUSSED — no vote yet",
        "tabled": "TABLED",
    }
    outcome = outcome_map.get(card.get("outcome_signal", ""), "PENDING")

    user_msg = f"""Land use event:
Title: {card.get('title', '')}
Location: {card.get('affected_area', 'location not specified')}
Municipality: {card.get('municipality_name', '')}
Status: {outcome}
Summary: {card.get('summary', '')}

Write the one-sentence market impact."""

    body = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 120,
        "system": IMPACT_SYSTEM,
        "messages": [{"role": "user", "content": user_msg}],
    }).encode()

    req = Request("https://api.anthropic.com/v1/messages", data=body, headers={
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    })
    try:
        with urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
        return data["content"][0]["text"].strip()
    except Exception as e:
        print(f"    impact framing failed: {e}")
        return None


# ── Card fetching ─────────────────────────────────────────────────────────

def get_cards_for_townships(municipality_keys, since_date):
    if not municipality_keys:
        return []
    keys_in = "(" + ",".join(f'"{k}"' for k in municipality_keys) + ")"
    params = (
        f"?select=id,title,summary,source_quote,outcome_signal,meeting_date,"
        f"municipality_id,municipality_name,affected_area,lat,lng,zip_code"
        f"&municipality_id=in.{keys_in}"
        f"&created_at=gte.{since_date.isoformat()}"
        f"&archived=eq.false"
        f"&surfaces_to_feed=eq.true"
        f"&order=meeting_date.desc"
        f"&limit=100"
    )
    return sb_get("concern_cards", params)

def get_coverage_for_account(account_id):
    return sb_get("pro_coverage", f"?pro_account_id=eq.{account_id}")


# ── Email rendering ───────────────────────────────────────────────────────

C = {
    "bg": "#0A0F1E", "surface": "#1B2236", "border": "#2A3452",
    "text": "#E8EDF5", "dim": "#8A95AB",
    "blue": "#3B82F6", "blueHi": "#60A5FA",
    "green": "#10B981", "red": "#EF4444", "amber": "#F59E0B",
    "impact": "#1E3A5F",  # subtle bg for the impact sentence
}

BADGE = {
    "approved":   ("#10B981", "Approved"),
    "denied":     ("#EF4444", "Denied"),
    "deferred":   ("#F59E0B", "Deferred"),
    "pending":    ("#8A95AB", "Pending"),
    "introduced": ("#3B82F6", "Introduced"),
    "discussed":  ("#3B82F6", "Discussed"),
    "tabled":     ("#8A95AB", "Tabled"),
}

def esc(s):
    return str(s or "").replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

def fmt_date(d):
    if not d:
        return ""
    try:
        return datetime.strptime(d[:10], "%Y-%m-%d").strftime("%b %-d")
    except Exception:
        return str(d)[:10]

def card_html(card, impact=None):
    badge_color, badge_label = BADGE.get(card.get("outcome_signal"), ("#8A95AB", "Pending"))
    quote = ""
    if card.get("source_quote"):
        quote = f"""<div style="border-left:2px solid {C['blue']};padding-left:12px;margin-bottom:8px;
          font-style:italic;color:{C['text']};font-size:12px;line-height:1.6;">
          &ldquo;{esc(card['source_quote'])}&rdquo;</div>"""
    impact_block = ""
    if impact:
        impact_block = f"""<div style="background:{C['impact']};border:1px solid {C['border']};border-radius:6px;
          padding:10px 12px;margin-top:10px;font-size:12px;color:{C['blueHi']};line-height:1.5;">
          <span style="font-weight:700;text-transform:uppercase;letter-spacing:0.06em;font-size:10px;">
          Market signal</span><br>{esc(impact)}</div>"""
    location = card.get("affected_area") or ""
    return f"""<div style="background:{C['surface']};border:1px solid {C['border']};border-radius:10px;padding:16px 18px;margin-bottom:10px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
    <span style="font-size:11px;color:{C['dim']};">{esc(location)} · {esc(fmt_date(card.get('meeting_date')))}</span>
    <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:{badge_color};
      border:1px solid {badge_color};border-radius:4px;padding:1px 6px;margin-left:8px;white-space:nowrap;">{badge_label}</span>
  </div>
  <div style="font-size:15px;color:{C['text']};font-weight:600;margin-bottom:6px;line-height:1.4;">{esc(card.get('title',''))}</div>
  {quote}
  <div style="font-size:13px;color:{C['dim']};line-height:1.6;">{esc(card.get('summary',''))}</div>
  {impact_block}
</div>"""

def render_digest(name, cards_with_impact, week_label, coverage_desc, dashboard_url):
    by_town = {}
    for card, impact in cards_with_impact:
        town = card.get("municipality_name") or "Township"
        by_town.setdefault(town, []).append((card, impact))

    town_blocks = ""
    for town, items in by_town.items():
        town_blocks += f"""<div style="margin-bottom:24px;">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:{C['blueHi']};
    border-bottom:1px solid {C['border']};padding-bottom:8px;margin-bottom:12px;">{esc(town)}</div>
  {"".join(card_html(c, imp) for c, imp in items)}
</div>"""

    n = len(cards_with_impact)
    t = len(by_town)
    coverage_line = f"Coverage: {esc(coverage_desc)}" if coverage_desc else ""

    if not cards_with_impact:
        body_content = f'<p style="font-size:14px;color:{C["dim"]};">No new land use activity in your coverage area this period.</p>'
    else:
        body_content = town_blocks

    return f"""<!DOCTYPE html><html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:{C['bg']};font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">
  <div style="margin-bottom:28px;">
    <span style="font-size:14px;font-weight:800;letter-spacing:0.06em;color:{C['blue']};">PIPELINE</span>
    <span style="font-size:12px;color:{C['dim']};"> · Land Use Intelligence</span>
  </div>
  <h1 style="font-size:20px;color:{C['text']};margin:0 0 4px;font-family:Georgia,serif;">What changed near your market</h1>
  <div style="font-size:12px;color:{C['dim']};margin-bottom:4px;">{esc(week_label)} · {n} event{"s" if n!=1 else ""} across {t} township{"s" if t!=1 else ""}</div>
  {f'<div style="font-size:11px;color:{C["dim"]};margin-bottom:24px;">{coverage_line}</div>' if coverage_line else '<div style="margin-bottom:24px;"></div>'}
  {body_content}
  <a href="{dashboard_url}" style="display:inline-block;margin-top:8px;font-size:13px;color:{C['blueHi']};text-decoration:none;">
    Full pipeline on your dashboard →
  </a>
  <div style="border-top:1px solid {C['border']};margin-top:36px;padding-top:16px;">
    <p style="font-size:11px;color:{C['dim']};line-height:1.6;margin:0;">
      <a href="{dashboard_url}" style="color:{C['dim']};">Dashboard</a> ·
      <a href="{SITE}/settings" style="color:{C['dim']};">Settings</a> ·
      <a href="{SITE}/settings?unsubscribe=1" style="color:{C['dim']};">Cancel</a><br>
      Pipeline · landusealert.com · NJ land use intelligence
    </p>
  </div>
</div>
</body></html>"""

def render_text(name, cards_with_impact, week_label):
    lines = [f"PIPELINE — {week_label}", "Land Use Intelligence — What changed near your market", ""]
    for card, impact in cards_with_impact:
        lines.append(f"[{card.get('municipality_name','')}] {card.get('title','')} ({card.get('outcome_signal','')})")
        lines.append(card.get("affected_area",""))
        lines.append(card.get("summary",""))
        if impact:
            lines.append(f"Market signal: {impact}")
        lines.append("")
    lines.append(f"Dashboard: {SITE}/dashboard")
    return "\n".join(lines)

def send_email(to, subject, html, text):
    payload = json.dumps({"from": FROM_EMAIL, "to": to, "subject": subject, "html": html, "text": text}).encode()
    req = Request("https://api.resend.com/emails", data=payload, headers={
        "Authorization": f"Bearer {RESEND_KEY}",
        "Content-Type": "application/json",
    })
    try:
        with urlopen(req) as r:
            return json.loads(r.read())
    except HTTPError as e:
        print(f"Resend error {e.code}: {e.read().decode()[:200]}")
        raise


# ── Main ──────────────────────────────────────────────────────────────────

def fmt_date_range(since):
    today = date.today()
    return f"{since.strftime('%b %-d')} – {today.strftime('%b %-d, %Y')}"

def coverage_description(zones):
    if not zones:
        return ""
    parts = []
    for z in zones:
        label = z.get("label")
        if label:
            parts.append(label)
        elif z.get("radius_miles") and z.get("center_lat"):
            parts.append(f"{z['radius_miles']:.0f}-mile radius")
        elif z.get("zip_codes"):
            parts.append(", ".join(z["zip_codes"][:3]))
    return " · ".join(parts) if parts else ""

def process_account(account, townships, coverage_zones, since_date, dry_run=False):
    muni_keys = [t["municipality_key"] for t in townships if t.get("active")]
    if not muni_keys:
        print(f"  skip {account['email']}: no active townships")
        return 0

    all_cards = get_cards_for_townships(muni_keys, since_date)

    # Filter by coverage
    filtered = [c for c in all_cards if card_in_coverage(c, coverage_zones)]

    if not filtered and all_cards:
        print(f"  {account['email']}: {len(all_cards)} cards, 0 in coverage area — skipping")
        return 0

    # Enrich with Claude impact framing
    cards_with_impact = []
    for card in filtered:
        impact = get_impact_framing(card) if ANTHROPIC_KEY and not dry_run else None
        cards_with_impact.append((card, impact))

    week_label = fmt_date_range(since_date)
    coverage_desc = coverage_description(coverage_zones)
    dashboard_url = f"{SITE}/dashboard"
    name = account.get("name", "")

    n = len(cards_with_impact)
    subject = f"Pipeline: {n} land use event{'s' if n!=1 else ''} in your market · {since_date.strftime('%b %-d')}"

    html = render_digest(name, cards_with_impact, week_label, coverage_desc, dashboard_url)
    text = render_text(name, cards_with_impact, week_label)

    print(f"  {'[DRY RUN] ' if dry_run else ''}→ {account['email']}: {n} events, {len(muni_keys)} townships")
    if not dry_run:
        send_email(account["email"], subject, html, text)
        sb_patch("pro_accounts", {"last_digest_at": datetime.utcnow().isoformat()}, f"?id=eq.{account['id']}")
        print(f"    sent OK")
    return n

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--daily", action="store_true")
    parser.add_argument("--test", metavar="EMAIL")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    freq = "daily" if args.daily else "weekly"
    since_date = date.today() - timedelta(days=1 if args.daily else 7)

    if args.test:
        print(f"Test send → {args.test}")
        accounts = sb_get("pro_accounts", f"?email=eq.{args.test}&status=eq.active")
        if not accounts:
            print("No active account found"); sys.exit(1)
        acct = accounts[0]
        townships = sb_get("pro_townships", f"?pro_account_id=eq.{acct['id']}&active=eq.true")
        coverage = get_coverage_for_account(acct["id"])
        process_account(acct, townships, coverage, since_date, dry_run=args.dry_run)
        return

    print(f"Pipeline {freq} digest (since {since_date})")
    settings_rows = sb_get("pro_email_settings", f"?frequency=eq.{freq}")
    account_ids = [s["pro_account_id"] for s in settings_rows]
    if not account_ids:
        print("No accounts due."); return

    ids_in = "(" + ",".join(f'"{i}"' for i in account_ids) + ")"
    accounts = sb_get("pro_accounts", f"?id=in.{ids_in}&status=eq.active")
    print(f"{len(accounts)} active accounts")

    total = 0
    for acct in accounts:
        print(f"\n{acct['email']}")
        townships = sb_get("pro_townships", f"?pro_account_id=eq.{acct['id']}&active=eq.true")
        coverage = get_coverage_for_account(acct["id"])
        try:
            total += process_account(acct, townships, coverage, since_date, dry_run=args.dry_run)
        except Exception as e:
            print(f"  ERROR: {e}")

    print(f"\nDone — {total} events delivered across {len(accounts)} accounts.")

if __name__ == "__main__":
    main()
