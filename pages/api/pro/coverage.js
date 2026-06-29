// GET — return coverage zones for the account
// POST { label, center_lat, center_lng, radius_miles, zip_codes } — add a zone
// DELETE { id } — remove a zone

import { getProSession, adminClient } from "../../../lib/proAuth";

const NOMINATIM = "https://nominatim.openstreetmap.org";

async function geocodeAddress(address) {
  const encoded = encodeURIComponent(`${address}, New Jersey`);
  const r = await fetch(`${NOMINATIM}/search?q=${encoded}&format=json&limit=1&countrycodes=us`, {
    headers: { "User-Agent": "Pipeline-LandUseAlert/1.0 (alerts@landusealert.com)" },
  });
  if (!r.ok) return null;
  const results = await r.json();
  if (!results.length) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

export default async function handler(req, res) {
  const session = await getProSession(req);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const db = adminClient();

  if (req.method === "GET") {
    const { data } = await db
      .from("pro_coverage")
      .select("id, label, center_lat, center_lng, radius_miles, zip_codes, created_at")
      .eq("pro_account_id", session.id)
      .order("created_at");
    return res.status(200).json({ coverage: data || [] });
  }

  if (req.method === "POST") {
    let { label, center_lat, center_lng, radius_miles, zip_codes, address } = req.body || {};

    // If an address string is provided, geocode it
    if (address && (!center_lat || !center_lng)) {
      const geo = await geocodeAddress(String(address).trim());
      if (!geo) return res.status(400).json({ error: "Could not geocode that address — try a city name or ZIP code." });
      center_lat = geo.lat;
      center_lng = geo.lng;
    }

    if (!center_lat && (!Array.isArray(zip_codes) || zip_codes.length === 0))
      return res.status(400).json({ error: "Provide a center address/coordinates or a list of ZIP codes." });

    const row = {
      pro_account_id: session.id,
      label: label ? String(label).slice(0, 80) : null,
      center_lat: center_lat ? parseFloat(center_lat) : null,
      center_lng: center_lng ? parseFloat(center_lng) : null,
      radius_miles: parseFloat(radius_miles || 15),
      zip_codes: Array.isArray(zip_codes) && zip_codes.length > 0
        ? zip_codes.map(z => String(z).trim()).filter(Boolean)
        : null,
    };

    const { data, error } = await db.from("pro_coverage").insert(row).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, zone: data });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "Zone ID required." });

    const { error } = await db
      .from("pro_coverage")
      .delete()
      .eq("id", id)
      .eq("pro_account_id", session.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
