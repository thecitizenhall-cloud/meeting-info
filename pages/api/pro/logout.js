// POST — clear session cookie

import { clearSessionCookie } from "../../../lib/proAuth";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
