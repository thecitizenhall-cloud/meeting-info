// Stripe webhook handler.
// Events handled:
//   checkout.session.completed  → activate account + create pro_townships + send welcome email
//   customer.subscription.updated → sync status
//   customer.subscription.deleted → mark canceled
//   invoice.payment_failed       → mark past_due + notify

import Stripe from "stripe";
import { adminClient } from "../../../lib/proAuth";
import { renderWelcomeEmail, renderPaymentFailedEmail, sendProEmail } from "../../../lib/proEmail";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pro.townhallcafe.org";

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-05-28.basil" });
}

async function handleCheckoutCompleted(session, db, s) {
  const accountId = session.metadata?.pro_account_id;
  if (!accountId) return;

  let townships = [];
  try { townships = JSON.parse(session.metadata?.townships || "[]"); } catch {}

  // Activate account
  const { data: account, error: accErr } = await db
    .from("pro_accounts")
    .update({
      status: "active",
      stripe_subscription_id: session.subscription,
    })
    .eq("id", accountId)
    .select("email, name, company")
    .single();

  if (accErr || !account) {
    console.error("webhook: account not found", accountId);
    return;
  }

  // Create township rows
  if (townships.length > 0) {
    await db.from("pro_townships").upsert(
      townships.map(t => ({
        pro_account_id: accountId,
        municipality_key: t.key,
        municipality_name: t.name,
        active: true,
      })),
      { onConflict: "pro_account_id,municipality_key" }
    );
  }

  // Default email settings
  await db.from("pro_email_settings").upsert(
    { pro_account_id: accountId, frequency: "weekly", board_types: ["planning", "zoning", "council"], send_day: "monday" },
    { onConflict: "pro_account_id" }
  );

  // Welcome email
  try {
    const tpl = renderWelcomeEmail({
      name: account.name,
      company: account.company,
      townships: townships.map(t => t.name),
      dashboardUrl: `${SITE}/dashboard`,
    });
    await sendProEmail({ to: account.email, ...tpl });
  } catch (e) {
    console.error("webhook: welcome email failed:", e.message);
  }
}

async function handleSubscriptionChange(subscription, db) {
  const accountId = subscription.metadata?.pro_account_id;
  if (!accountId) return;

  const stripeStatus = subscription.status; // active, past_due, canceled, etc.
  const ourStatus = stripeStatus === "active" ? "active"
    : stripeStatus === "past_due" ? "past_due"
    : stripeStatus === "canceled" ? "canceled"
    : undefined;

  if (ourStatus) {
    await db.from("pro_accounts").update({ status: ourStatus }).eq("id", accountId);
  }
}

async function handleSubscriptionDeleted(subscription, db) {
  const accountId = subscription.metadata?.pro_account_id;
  if (!accountId) return;
  await db.from("pro_accounts").update({ status: "canceled" }).eq("id", accountId);
  await db.from("pro_townships").update({ active: false }).eq("pro_account_id", accountId);
}

async function handlePaymentFailed(invoice, db, s) {
  const customerId = invoice.customer;
  const { data: account } = await db
    .from("pro_accounts")
    .select("id, email, name")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!account) return;

  await db.from("pro_accounts").update({ status: "past_due" }).eq("id", account.id);

  try {
    const portalSession = await s.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${SITE}/dashboard`,
    });
    const tpl = renderPaymentFailedEmail({ name: account.name, portalUrl: portalSession.url });
    await sendProEmail({ to: account.email, ...tpl });
  } catch (e) {
    console.error("webhook: payment-failed email:", e.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  const s = stripe();
  let event;
  try {
    event = s.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("webhook signature failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  const db = adminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, db, s);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object, db);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, db);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object, db, s);
        break;
    }
  } catch (err) {
    console.error(`webhook ${event.type} error:`, err.message);
    return res.status(500).json({ error: "Handler error" });
  }

  return res.status(200).json({ received: true });
}
