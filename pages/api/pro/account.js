// GET — return account info for the authenticated session
// PATCH { name, company } — update account details

import { getProSession, adminClient } from "../../../lib/proAuth";

export default async function handler(req, res) {
  const session = await getProSession(req);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const db = adminClient();

  if (req.method === "GET") {
    const { data: account } = await db
      .from("pro_accounts")
      .select("id, email, name, company, status, created_at")
      .eq("id", session.id)
      .single();

    const { data: townships } = await db
      .from("pro_townships")
      .select("id, municipality_key, municipality_name, active, added_at")
      .eq("pro_account_id", session.id)
      .order("added_at");

    const { data: settings } = await db
      .from("pro_email_settings")
      .select("frequency, board_types, send_day")
      .eq("pro_account_id", session.id)
      .maybeSingle();

    return res.status(200).json({ account, townships: townships || [], settings });
  }

  if (req.method === "PATCH") {
    const { name, company } = req.body || {};
    const updates = {};
    if (name && typeof name === "string" && name.trim().length >= 2) updates.name = name.trim();
    if (typeof company === "string") updates.company = company.trim() || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update." });

    const { data } = await db.from("pro_accounts").update(updates).eq("id", session.id).select("name, company").single();
    return res.status(200).json({ ok: true, account: data });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
