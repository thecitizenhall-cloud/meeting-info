// GET — return email settings
// PATCH { frequency?, board_types?, send_day? } — update

import { getProSession, adminClient } from "../../../lib/proAuth";

const VALID_FREQ = ["weekly", "daily", "instant"];
const VALID_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const VALID_BOARDS = ["planning", "zoning", "council"];

export default async function handler(req, res) {
  const session = await getProSession(req);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const db = adminClient();

  if (req.method === "GET") {
    const { data } = await db
      .from("pro_email_settings")
      .select("frequency, board_types, send_day")
      .eq("pro_account_id", session.id)
      .maybeSingle();
    return res.status(200).json({ settings: data || { frequency: "weekly", board_types: ["planning", "zoning", "council"], send_day: "monday" } });
  }

  if (req.method === "PATCH") {
    const { frequency, board_types, send_day } = req.body || {};
    const updates = {};

    if (frequency !== undefined) {
      if (!VALID_FREQ.includes(frequency)) return res.status(400).json({ error: "Invalid frequency." });
      updates.frequency = frequency;
    }
    if (board_types !== undefined) {
      if (!Array.isArray(board_types) || board_types.some(b => !VALID_BOARDS.includes(b)))
        return res.status(400).json({ error: "Invalid board types." });
      if (board_types.length === 0) return res.status(400).json({ error: "Select at least one board type." });
      updates.board_types = board_types;
    }
    if (send_day !== undefined) {
      if (!VALID_DAYS.includes(send_day)) return res.status(400).json({ error: "Invalid day." });
      updates.send_day = send_day;
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update." });

    updates.updated_at = new Date().toISOString();
    await db.from("pro_email_settings").upsert(
      { pro_account_id: session.id, ...updates },
      { onConflict: "pro_account_id" }
    );

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
