"""
pro_notifier.py

Sends weekly (or daily) land-use digest emails to active pro subscribers.
Run from cron or GitHub Actions after the nightly civic engine ingest.

Usage:
  python pro_notifier.py                # all due weekly accounts
  python pro_notifier.py --daily        # all due daily accounts
  python pro_notifier.py --test EMAIL   # send test digest to EMAIL

Env vars required:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  RESEND_API_KEY
  PRO_EMAIL_FROM          (optional, defaults to "Townhall Café Pro <pro@townhallcafe.org>")
  NEXT_PUBLIC_SITE_URL    (optional, defaults to "https://pro.townhallcafe.org")
"""

import os
import sys
import json
import argparse
from datetime import datetime, timedelta, date
from urllib.request import Request, urlopen
from urllib.error import HTTPError

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
RESEND_KEY = os.environ["RESEND_API_KEY"]
FROM_EMAIL = os.environ.get("PRO_EMAIL_FROM", "Townhall Café Pro <pro@townhallcafe.org>")
SITE = os.environ.get("NEXT_PUBLIC_SITE_URL", "https://pro.townhallcafe.org")


def sb_get(path, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}{params}"
    req = Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    })
    with urlopen(req) as r:
        return json.loads(r.read())


def sb_patch(path, data, filters=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}{filters}"
    body = json.dumps(data).encode()
    req = Request(url, data=body, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }, method="PATCH")
    with urlopen(req) as r:
        return r.status


def send_email(to, subject, html, text):
    payload = json.dumps({
        "from": FROM_EMAIL,
        "to": to,
        "subject": subject,
        "html": html,
        "text": text,
    }).encode()
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


def get_cards_for_townships(municipality_keys, since_date):
    """Fetch concern cards for given municipalities since a given date."""
    if not municipality_keys:
        return []
    # Build filter: municipality_id in (k1,k2,...) AND created_at >= since_date
    keys_in = "(" + ",".join(f'"{k}"' for k in municipality_keys) + ")"
    params = (
        f"?select=id,title,summary,source_quote,outcome_signal,meeting_date,municipality_id,municipality_name"
        f"&municipality_id=in.{keys_in}"
        f"&created_at=gte.{since_date.isoformat()}"
        f"&order=meeting_date.desc"
        f"&limit=50"
    )
    return sb_get("concern_cards", params)


def fmt_date_range(since):
    today = date.today()
    return f"{since.strftime('%b %-d')} – {today.strftime('%b %-d, %Y')}"


def render_card_text(card):
    name = card.get("municipality_name") or card.get("municipality_id") or "Township"
    return f"[{name}] {card['title']} ({card.get('outcome_signal','pending')})\n{card.get('summary','')}"


def render_digest_html(name, cards, week_label, dashboard_url):
    """Minimal inline HTML for the digest email."""
    C = {
        "bg": "#0A0F1E", "surface": "#1B2236", "border": "#2A3452",
        "text": "#E8EDF5", "dim": "#8A95AB",
        "blue": "#3B82F6", "blueHi": "#60A5FA",
        "green": "#10B981", "red": "#EF4444", "amber": "#F59E0B",
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
            return datetime.strptime(d[:10], "%Y-%m-%d").strftime("%A, %B %-d")
        except Exception:
            return str(d)[:10]

    # Group by municipality
    by_town = {}
    for card in cards:
        town = card.get("municipality_name") or card.get("municipality_id") or "Township"
        by_town.setdefault(town, []).append(card)

    card_blocks = ""
    for town, town_cards in by_town.items():
        card_blocks += f"""
<div style="margin-bottom:24px;">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:{C['blueHi']};
    border-bottom:1px solid {C['border']};padding-bottom:8px;margin-bottom:12px;">{esc(town)}</div>"""
        for card in town_cards:
            badge_color, badge_label = BADGE.get(card.get("outcome_signal"), ("#8A95AB", "Pending"))
            quote_html = ""
            if card.get("source_quote"):
                quote_html = f"""<div style="border-left:2px solid {C['blue']};padding-left:12px;margin-bottom:8px;
                  font-style:italic;color:{C['text']};font-size:12px;line-height:1.6;">&ldquo;{esc(card['source_quote'])}&rdquo;</div>"""
            card_blocks += f"""
<div style="background:{C['surface']};border:1px solid {C['border']};border-radius:10px;padding:16px 18px;margin-bottom:10px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
    <span style="font-size:11px;color:{C['dim']};text-transform:uppercase;letter-spacing:0.08em;">{esc(fmt_date(card.get('meeting_date')))}</span>
    <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:{badge_color};
      border:1px solid {badge_color};border-radius:4px;padding:1px 6px;margin-left:8px;white-space:nowrap;">{badge_label}</span>
  </div>
  <div style="font-size:15px;color:{C['text']};font-weight:600;margin-bottom:6px;line-height:1.4;">{esc(card.get('title',''))}</div>
  {quote_html}
  <div style="font-size:13px;color:{C['dim']};line-height:1.6;">{esc(card.get('summary',''))}</div>
</div>"""
        card_blocks += "</div>"

    if not cards:
        card_blocks = f'<p style="font-size:14px;color:{C["dim"]};">No new land-use activity this period for your monitored townships.</p>'

    item_count = len(cards)
    town_count = len(by_town)
    return f"""<!DOCTYPE html><html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:{C['bg']};font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">
  <div style="margin-bottom:28px;">
    <span style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:{C['blue']};">Townhall Café</span>
    <span style="font-size:13px;color:{C['dim']};"> · Professional Intelligence</span>
  </div>
  <h1 style="font-size:22px;color:{C['text']};margin:0 0 4px;font-family:Georgia,serif;">Land-Use Intelligence</h1>
  <div style="font-size:13px;color:{C['dim']};margin-bottom:24px;">{esc(week_label)} · {item_count} item{"s" if item_count != 1 else ""} across {town_count} township{"s" if town_count != 1 else ""}</div>
  {card_blocks}
  <a href="{dashboard_url}" style="display:inline-block;margin-top:8px;font-size:13px;color:{C['blueHi']};text-decoration:none;">Full activity on your dashboard →</a>
  <div style="border-top:1px solid {C['border']};margin-top:36px;padding-top:16px;">
    <p style="font-size:11px;color:{C['dim']};line-height:1.6;margin:0;">
      <a href="{SITE}/dashboard" style="color:{C['dim']};">Dashboard</a> ·
      <a href="{SITE}/settings" style="color:{C['dim']};">Settings</a> ·
      <a href="{SITE}/settings?unsubscribe=1" style="color:{C['dim']};">Cancel subscription</a>
    </p>
  </div>
</div>
</body></html>"""


def process_account(account, townships, settings, since_date, dry_run=False):
    muni_keys = [t["municipality_key"] for t in townships if t.get("active")]
    if not muni_keys:
        print(f"  skip {account['email']}: no active townships")
        return

    cards = get_cards_for_townships(muni_keys, since_date)
    week_label = fmt_date_range(since_date)
    dashboard_url = f"{SITE}/dashboard"
    name = account.get("name", "there")

    subject = f"Pro Intelligence: {week_label} · {len(cards)} item{'s' if len(cards) != 1 else ''}"
    html = render_digest_html(name, cards, week_label, dashboard_url)
    text = f"Townhall Café Pro — {week_label}\n\n" + "\n\n".join(render_card_text(c) for c in cards) + f"\n\nDashboard: {dashboard_url}"

    print(f"  {'[DRY RUN] Would send' if dry_run else 'Sending'} to {account['email']}: {len(cards)} cards, {len(muni_keys)} townships")
    if not dry_run:
        send_email(account["email"], subject, html, text)
        sb_patch("pro_accounts", {"last_digest_at": datetime.utcnow().isoformat()}, f"?id=eq.{account['id']}")
        print(f"  Sent OK to {account['email']}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--daily", action="store_true", help="Send daily digests (default: weekly)")
    parser.add_argument("--test", metavar="EMAIL", help="Send test digest to EMAIL")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    freq = "daily" if args.daily else "weekly"
    since_date = date.today() - timedelta(days=1 if args.daily else 7)

    if args.test:
        print(f"Sending test digest to {args.test}")
        accounts = sb_get("pro_accounts", f"?select=*&email=eq.{args.test}&status=eq.active")
        if not accounts:
            print(f"No active account found for {args.test}")
            sys.exit(1)
        account = accounts[0]
        townships = sb_get("pro_townships", f"?select=*&pro_account_id=eq.{account['id']}&active=eq.true")
        process_account(account, townships, None, since_date, dry_run=args.dry_run)
        return

    print(f"Running {freq} pro digest (since {since_date})")

    # Fetch all active accounts whose email settings match the frequency
    settings_rows = sb_get(
        "pro_email_settings",
        f"?select=pro_account_id,frequency,board_types,send_day&frequency=eq.{freq}"
    )
    account_ids = [s["pro_account_id"] for s in settings_rows]
    if not account_ids:
        print("No accounts with matching frequency.")
        return

    ids_filter = "(" + ",".join(f'"{i}"' for i in account_ids) + ")"
    accounts = sb_get("pro_accounts", f"?select=*&id=in.{ids_filter}&status=eq.active")
    print(f"Found {len(accounts)} active accounts")

    settings_by_acct = {s["pro_account_id"]: s for s in settings_rows}

    for account in accounts:
        print(f"\nProcessing {account['email']}")
        townships = sb_get("pro_townships", f"?select=*&pro_account_id=eq.{account['id']}&active=eq.true")
        settings = settings_by_acct.get(account["id"])
        try:
            process_account(account, townships, settings, since_date, dry_run=args.dry_run)
        except Exception as e:
            print(f"  ERROR for {account['email']}: {e}")

    print("\nDone.")


if __name__ == "__main__":
    main()
