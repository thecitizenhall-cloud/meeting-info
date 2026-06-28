// Magic-link auth for pro accounts.
// Session cookie: "pro_session" — httpOnly, SameSite=Lax, 30 days.

import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "pro_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export function setSessionCookie(res, token) {
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}${secure}`);
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}

export function getTokenFromCookie(req) {
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map(s => s.trim()).find(s => s.startsWith(`${COOKIE_NAME}=`));
  return match ? match.slice(COOKIE_NAME.length + 1) : null;
}

export async function getProSession(req) {
  const token = getTokenFromCookie(req);
  if (!token) return null;

  const db = adminClient();
  const { data } = await db
    .from("pro_accounts")
    .select("id, email, name, company, status, stripe_customer_id, session_expires_at")
    .eq("session_token", token)
    .maybeSingle();

  if (!data) return null;
  if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) return null;
  if (data.status === "canceled") return null;

  return data;
}

export async function issueSession(accountId) {
  const token = globalThis.crypto?.randomUUID?.() ?? require("crypto").randomUUID();
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const db = adminClient();
  await db.from("pro_accounts").update({ session_token: token, session_expires_at: expires }).eq("id", accountId);
  return token;
}
