// POST { email }
// Sends a magic-link login email. Token valid 15 minutes.

import { adminClient } from "../../../lib/proAuth";
import { renderLoginEmail, sendProEmail } from "../../../lib/proEmail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pro.townhallcafe.org";
const LOGIN_TTL_MS = 15 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Valid email required." });

  const db = adminClient();

  // Don't reveal whether account exists — always respond the same way.
  const { data: account } = await db
    .from("pro_accounts")
    .select("id, name, status, session_token")
    .eq("email", email)
    .maybeSingle();

  if (!account || account.status === "canceled") {
    // Pretend success so we don't enumerate accounts.
    return res.status(200).json({ ok: true });
  }

  // Generate a short-lived login token (separate from session token).
  // We reuse session_token field but set a short expiry.
  const token = (globalThis.crypto?.randomUUID?.() ?? require("crypto").randomUUID());
  const expires = new Date(Date.now() + LOGIN_TTL_MS).toISOString();
  await db.from("pro_accounts").update({ session_token: token, session_expires_at: expires }).eq("id", account.id);

  const loginUrl = `${SITE}/auth?token=${token}`;

  try {
    const tpl = renderLoginEmail({ name: account.name, loginUrl });
    await sendProEmail({ to: email, ...tpl });
  } catch (e) {
    console.error("login email failed:", e.message);
    return res.status(502).json({ error: "Could not send login email — try again." });
  }

  return res.status(200).json({ ok: true });
}
