// Email templates for pro accounts. Uses Resend.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pro.townhallcafe.org";

const C = {
  bg: "#0A0F1E", surface: "#1B2236", border: "#2A3452",
  text: "#E8EDF5", dim: "#8A95AB",
  blue: "#3B82F6", blueHi: "#60A5FA", blueLo: "#1E3A5F",
  green: "#10B981", red: "#EF4444", amber: "#F59E0B",
};

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDate(d) {
  if (!d) return "";
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function shell(title, body) {
  return `<!DOCTYPE html><html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">
  <div style="margin-bottom:28px;">
    <span style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.blue};">Townhall Café</span>
    <span style="font-size:13px;color:${C.dim};"> · Professional Intelligence</span>
  </div>
  ${body}
  <div style="border-top:1px solid ${C.border};margin-top:36px;padding-top:16px;">
    <p style="font-size:11px;color:${C.dim};line-height:1.6;margin:0;">
      <a href="${SITE}/dashboard" style="color:${C.dim};">Dashboard</a> ·
      <a href="${SITE}/settings" style="color:${C.dim};">Account settings</a> ·
      <a href="${SITE}/settings?unsubscribe=1" style="color:${C.dim};">Cancel subscription</a><br>
      Townhall Café Professional Intelligence · civic data for NJ municipalities
    </p>
  </div>
</div>
</body></html>`;
}

function cardBlock(card) {
  const link = `${SITE}/card/${card.id}`;
  const BADGE = {
    approved:   { label: "Approved",   color: C.green },
    denied:     { label: "Denied",     color: C.red },
    deferred:   { label: "Deferred",   color: C.amber },
    pending:    { label: "Pending",    color: C.dim },
    introduced: { label: "Introduced", color: C.blue },
    discussed:  { label: "Discussed",  color: C.blue },
    tabled:     { label: "Tabled",     color: C.dim },
  };
  const badge = BADGE[card.outcome_signal] || BADGE.pending;
  return `<div style="background:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:16px 18px;margin-bottom:10px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
    <span style="font-size:11px;color:${C.dim};text-transform:uppercase;letter-spacing:0.08em;">
      ${esc(card.municipality_name || "Jackson Township")} · ${esc(fmtDate(card.meeting_date))}
    </span>
    <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;
      color:${badge.color};border:1px solid ${badge.color};border-radius:4px;padding:1px 6px;margin-left:8px;white-space:nowrap;">
      ${badge.label}
    </span>
  </div>
  <div style="font-size:15px;color:${C.text};font-weight:600;margin-bottom:6px;line-height:1.4;">
    <a href="${link}" style="color:${C.text};text-decoration:none;">${esc(card.title)}</a>
  </div>
  ${card.source_quote
    ? `<div style="border-left:2px solid ${C.blue};padding-left:12px;margin-bottom:8px;font-style:italic;color:${C.text};font-size:12px;line-height:1.6;">&ldquo;${esc(card.source_quote)}&rdquo;</div>`
    : ""}
  <div style="font-size:13px;color:${C.dim};line-height:1.6;margin-bottom:8px;">${esc(card.summary)}</div>
  <a href="${link}" style="font-size:12px;color:${C.blueHi};text-decoration:none;">View full record →</a>
</div>`;
}

export function renderWelcomeEmail({ name, company, townships, dashboardUrl }) {
  const body = `
<h1 style="font-size:26px;color:${C.text};margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;">Welcome, ${esc(name)}.</h1>
<p style="font-size:14px;color:${C.dim};margin:0 0 24px;">${esc(company || "Your account")} is now live on Townhall Café Pro Intelligence.</p>
<div style="background:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:16px 18px;margin-bottom:24px;">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:${C.blueHi};margin-bottom:10px;">Monitoring</div>
  ${townships.map(t => `<div style="font-size:14px;color:${C.text};padding:3px 0;">${esc(t)}</div>`).join("")}
</div>
<p style="font-size:14px;color:${C.dim};line-height:1.7;margin:0 0 24px;">Your first digest will arrive on your next scheduled send. Your dashboard has everything the civic engine has already parsed — hearings, active applications, and recent decisions.</p>
<a href="${dashboardUrl}" style="display:inline-block;background:${C.blue};color:#fff;font-size:14px;font-weight:600;padding:11px 24px;border-radius:8px;text-decoration:none;">Open dashboard →</a>`;
  return {
    subject: `Welcome to Townhall Café Pro, ${name}`,
    html: shell("Welcome — Townhall Café Pro", body),
    text: `Welcome, ${name}.\n\nMonitoring: ${townships.join(", ")}\n\nDashboard: ${dashboardUrl}\n\nTownhall Café Pro · townhallcafe.org`,
  };
}

export function renderLoginEmail({ name, loginUrl }) {
  const body = `
<h1 style="font-size:24px;color:${C.text};margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;">Sign in to your account</h1>
<p style="font-size:14px;color:${C.dim};line-height:1.7;margin:0 0 24px;">Click below${name ? `, ${esc(name)}` : ""} — this link expires in 15 minutes.</p>
<a href="${loginUrl}" style="display:inline-block;background:${C.blue};color:#fff;font-size:14px;font-weight:600;padding:11px 24px;border-radius:8px;text-decoration:none;">Sign in →</a>
<p style="font-size:12px;color:${C.dim};margin:20px 0 0;">Didn't request this? Ignore this email — your account is unchanged.</p>`;
  return {
    subject: "Sign in to Townhall Café Pro",
    html: shell("Sign in — Townhall Café Pro", body),
    text: `Sign in to Townhall Café Pro:\n${loginUrl}\n\nExpires in 15 minutes.`,
  };
}

export function renderPaymentFailedEmail({ name, portalUrl }) {
  const body = `
<h1 style="font-size:24px;color:${C.text};margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;">Payment failed</h1>
<p style="font-size:14px;color:${C.dim};line-height:1.7;margin:0 0 24px;">Hi ${esc(name)}, we couldn't process your Townhall Café Pro payment. Your account stays active for now — please update your payment method to avoid interruption.</p>
<a href="${portalUrl}" style="display:inline-block;background:${C.amber};color:#000;font-size:14px;font-weight:600;padding:11px 24px;border-radius:8px;text-decoration:none;">Update payment method →</a>`;
  return {
    subject: "Action required: Townhall Café Pro payment failed",
    html: shell("Payment failed — Townhall Café Pro", body),
    text: `Hi ${name},\n\nYour Townhall Café Pro payment failed.\nUpdate payment: ${portalUrl}`,
  };
}

export function renderProDigest({ name, cards, weekLabel, dashboardUrl }) {
  const byTown = {};
  for (const card of cards) {
    const k = card.municipality_name || "Jackson Township";
    (byTown[k] = byTown[k] || []).push(card);
  }
  const townBlocks = Object.entries(byTown).map(([town, tc]) => `
<div style="margin-bottom:24px;">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:${C.blueHi};border-bottom:1px solid ${C.border};padding-bottom:8px;margin-bottom:12px;">${esc(town)}</div>
  ${tc.map(cardBlock).join("")}
</div>`).join("");

  const body = `
<h1 style="font-size:22px;color:${C.text};margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;">Land-Use Intelligence</h1>
<div style="font-size:13px;color:${C.dim};margin-bottom:24px;">${esc(weekLabel)} · ${cards.length} item${cards.length !== 1 ? "s" : ""} across ${Object.keys(byTown).length} township${Object.keys(byTown).length !== 1 ? "s" : ""}</div>
${cards.length === 0
  ? `<p style="font-size:14px;color:${C.dim};">No new land-use activity this period for your monitored townships.</p>`
  : townBlocks}
<a href="${dashboardUrl}" style="display:inline-block;margin-top:8px;font-size:13px;color:${C.blueHi};text-decoration:none;">Full activity on your dashboard →</a>`;

  return {
    subject: `Pro Intelligence: ${weekLabel} · ${cards.length} item${cards.length !== 1 ? "s" : ""}`,
    html: shell(`Pro Intelligence — ${weekLabel}`, body),
    text: `Townhall Café Pro — ${weekLabel}\n\n${cards.map(c => `${c.municipality_name}: ${c.title} (${c.outcome_signal})\n${c.summary}`).join("\n\n")}\n\nDashboard: ${dashboardUrl}`,
  };
}

export async function sendProEmail({ to, subject, html, text }) {
  const from = process.env.PRO_EMAIL_FROM || "Townhall Café Pro <pro@townhallcafe.org>";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`);
  return r.json();
}
