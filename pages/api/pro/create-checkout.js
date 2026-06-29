// POST { name, company, email, townships: [{key, name}] }
// Creates a pending pro_account and Stripe Checkout session.
// Returns { url } for client redirect.

import Stripe from "stripe";
import { adminClient } from "../../../lib/proAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pro.townhallcafe.org";

function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-05-28.basil" });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, company, email, townships, coverage_address, coverage_radius_miles } = req.body || {};
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanName = String(name || "").trim();
  const cleanCompany = String(company || "").trim() || null;

  if (cleanName.length < 2) return res.status(400).json({ error: "Full name is required." });
  if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: "Valid email is required." });
  if (!Array.isArray(townships) || townships.length === 0)
    return res.status(400).json({ error: "Select at least one township to monitor." });

  const db = adminClient();
  const s = stripe();

  try {
    const { data: existing } = await db
      .from("pro_accounts")
      .select("id, status, stripe_customer_id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing?.status === "active")
      return res.status(409).json({ error: "An active account already exists for this email. Please sign in." });

    // Stripe customer
    let customerId = existing?.stripe_customer_id;
    if (!customerId) {
      const customer = await s.customers.create({
        email: cleanEmail,
        name: cleanName,
        metadata: { company: cleanCompany || "" },
      });
      customerId = customer.id;
    }

    // Upsert pending account
    let accountId;
    if (existing) {
      const { data } = await db
        .from("pro_accounts")
        .update({ name: cleanName, company: cleanCompany, stripe_customer_id: customerId, status: "pending" })
        .eq("id", existing.id)
        .select("id")
        .single();
      accountId = data.id;
    } else {
      const { data } = await db
        .from("pro_accounts")
        .insert({ email: cleanEmail, name: cleanName, company: cleanCompany, stripe_customer_id: customerId, status: "pending" })
        .select("id")
        .single();
      accountId = data.id;
    }

    // Store coverage intent in metadata so webhook can create pro_coverage row
    const coverageMeta = coverage_address
      ? JSON.stringify({ address: String(coverage_address).slice(0, 200), radius_miles: coverage_radius_miles || 15 })
      : null;

    const townshipsMeta = JSON.stringify(
      townships.slice(0, 20).map(t => ({ key: String(t.key).slice(0, 64), name: String(t.name).slice(0, 128) }))
    );

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) throw new Error("STRIPE_PRICE_ID env var not set.");

    const session = await s.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: townships.length }],
      metadata: { pro_account_id: accountId, townships: townshipsMeta, coverage: coverageMeta },
      subscription_data: { metadata: { pro_account_id: accountId, townships: townshipsMeta, coverage: coverageMeta } },
      success_url: `${SITE}/dashboard?welcome=1`,
      cancel_url: `${SITE}/signup?canceled=1`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout:", err.message);
    return res.status(502).json({ error: "Could not start checkout — please try again." });
  }
}
