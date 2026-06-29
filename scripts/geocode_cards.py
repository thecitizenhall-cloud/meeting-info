"""
scripts/geocode_cards.py

Geocodes concern_cards.affected_area → lat, lng, zip_code using Nominatim.
Run after each nightly ingest to keep new cards geocoded.

Usage:
  python scripts/geocode_cards.py                  # geocode all ungeooded cards
  python scripts/geocode_cards.py --dry-run        # show what would be geocoded
  python scripts/geocode_cards.py --limit 100      # cap batch size
  python scripts/geocode_cards.py --muni jackson_nj  # one municipality only

Env vars:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Rate: Nominatim allows 1 req/sec. This script enforces that automatically.
"""

import os
import sys
import json
import time
import argparse
from urllib.request import Request, urlopen, quote
from urllib.error import HTTPError, URLError

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

NOMINATIM = "https://nominatim.openstreetmap.org"
USER_AGENT = "Pipeline-LandUseAlert/1.0 (alerts@landusealert.com)"

# Municipality ID prefix → town+state string to bias geocoding
MUNI_TOWN_BIAS = {
    "jackson_nj":  "Jackson Township, NJ",
    "lakewood_nj": "Lakewood Township, NJ",
    # add as coverage expands
}

def sb_get(path, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}{params}"
    req = Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    with urlopen(req) as r:
        return json.loads(r.read())

def sb_patch(table, row_id, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{row_id}"
    body = json.dumps(data).encode()
    req = Request(url, data=body, method="PATCH", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    with urlopen(req) as r:
        return r.status

def nominatim_search(query):
    """Search Nominatim, return (lat, lng) or None."""
    encoded = quote(query)
    url = f"{NOMINATIM}/search?q={encoded}&format=json&limit=1&countrycodes=us"
    req = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(req, timeout=10) as r:
            results = json.loads(r.read())
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except (HTTPError, URLError, ValueError) as e:
        print(f"    Nominatim error: {e}")
    return None

def nominatim_reverse(lat, lng):
    """Reverse geocode lat/lng → ZIP code."""
    url = f"{NOMINATIM}/reverse?lat={lat}&lon={lng}&format=json&zoom=15"
    req = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        return data.get("address", {}).get("postcode", "").strip() or None
    except (HTTPError, URLError, ValueError):
        return None

def town_bias(municipality_id):
    """Get the town+state string to append to the address for NJ geocoding."""
    for prefix, town in MUNI_TOWN_BIAS.items():
        if municipality_id and municipality_id.startswith(prefix):
            return town
    return "New Jersey"

def geocode_card(card):
    """Returns (lat, lng, zip_code) or None."""
    area = (card.get("affected_area") or "").strip()
    if not area or len(area) < 5:
        return None

    bias = town_bias(card.get("municipality_id"))
    query = f"{area}, {bias}"

    result = nominatim_search(query)
    if not result:
        # Fallback: try without town bias in case area already has a full address
        result = nominatim_search(f"{area}, New Jersey")
    if not result:
        return None

    lat, lng = result
    time.sleep(1)  # Nominatim rate limit: 1 req/sec
    zip_code = nominatim_reverse(lat, lng)
    time.sleep(1)

    return lat, lng, zip_code

def load_ungeooded(muni_prefix=None, limit=500):
    muni_filter = f"&municipality_id=like.{muni_prefix}%" if muni_prefix else ""
    params = (
        f"?select=id,affected_area,municipality_id"
        f"&geocoded_at=is.null"
        f"&affected_area=not.is.null"
        f"{muni_filter}"
        f"&order=created_at.desc"
        f"&limit={limit}"
    )
    return sb_get("concern_cards", params)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--muni", help="municipality_id prefix (e.g. jackson_nj)")
    args = parser.parse_args()

    cards = load_ungeooded(muni_prefix=args.muni, limit=args.limit)
    print(f"Found {len(cards)} ungeooded cards")

    ok = 0
    failed = 0
    skipped = 0

    for card in cards:
        area = (card.get("affected_area") or "").strip()
        print(f"  [{card['id'][:8]}] {area[:60]!r}")

        if args.dry_run:
            continue

        result = geocode_card(card)
        if not result:
            print(f"    → no result")
            failed += 1
            # Mark as attempted so we don't retry forever
            sb_patch("concern_cards", card["id"], {
                "geocoded_at": "now()",
            })
            continue

        lat, lng, zip_code = result
        print(f"    → {lat:.5f}, {lng:.5f}  ZIP {zip_code or '?'}")
        sb_patch("concern_cards", card["id"], {
            "lat": lat,
            "lng": lng,
            "zip_code": zip_code,
            "geocoded_at": "now()",
        })
        ok += 1

    if not args.dry_run:
        print(f"\nDone: {ok} geocoded, {failed} failed, {skipped} skipped")
    else:
        print(f"\n[dry-run] Would geocode {len(cards)} cards")

if __name__ == "__main__":
    main()
