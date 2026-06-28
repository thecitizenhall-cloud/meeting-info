// GET ?token=xxx
// Validates magic-link token, extends session to 30 days, sets cookie, redirects to /dashboard.

import { adminClient, setSessionCookie, issueSession } from "../../../lib/proAuth";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pro.townhallcafe.org";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const token = String(req.query.token || "").trim();
  if (!token) return res.redirect(302, "/login?error=missing_token");

  const db = adminClient();
  const { data: account } = await db
    .from("pro_accounts")
    .select("id, status, session_expires_at")
    .eq("session_token", token)
    .maybeSingle();

  if (!account) return res.redirect(302, "/login?error=invalid_token");
  if (account.session_expires_at && new Date(account.session_expires_at) < new Date())
    return res.redirect(302, "/login?error=expired_token");
  if (account.status === "canceled") return res.redirect(302, "/login?error=account_canceled");

  // Issue a full 30-day session.
  const sessionToken = await issueSession(account.id);
  setSessionCookie(res, sessionToken);

  return res.redirect(302, "/dashboard");
}
