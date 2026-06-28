// GET — list monitored townships
// POST { key, name } — add a township (+ update Stripe subscription quantity)
// DELETE { key } — remove a township

import Stripe from "stripe";
import { getProSession, adminClient } from "../../../lib/proAuth";

function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-05-28.basil" });
}

async function updateStripeQuantity(subscriptionId, newQty) {
  const s = stripe();
  const subscription = await s.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) return;
  await s.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, quantity: newQty }],
    proration_behavior: "always_invoice",
  });
}

export default async function handler(req, res) {
  const session = await getProSession(req);
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  if (session.status !== "active" && session.status !== "past_due")
    return res.status(403).json({ error: "Subscription not active" });

  const db = adminClient();

  if (req.method === "GET") {
    const { data } = await db
      .from("pro_townships")
      .select("id, municipality_key, municipality_name, active, added_at")
      .eq("pro_account_id", session.id)
      .order("municipality_name");
    return res.status(200).json({ townships: data || [] });
  }

  if (req.method === "POST") {
    const { key, name } = req.body || {};
    if (!key || !name) return res.status(400).json({ error: "Township key and name required." });

    // Check for existing (may be inactive)
    const { data: existing } = await db
      .from("pro_townships")
      .select("id, active")
      .eq("pro_account_id", session.id)
      .eq("municipality_key", String(key).slice(0, 64))
      .maybeSingle();

    if (existing?.active) return res.status(409).json({ error: "Already monitoring this township." });

    if (existing) {
      await db.from("pro_townships").update({ active: true }).eq("id", existing.id);
    } else {
      await db.from("pro_townships").insert({
        pro_account_id: session.id,
        municipality_key: String(key).slice(0, 64),
        municipality_name: String(name).slice(0, 128),
        active: true,
      });
    }

    // Update Stripe quantity
    try {
      const { data: account } = await db
        .from("pro_accounts")
        .select("stripe_subscription_id")
        .eq("id", session.id)
        .single();
      if (account?.stripe_subscription_id) {
        const { count } = await db
          .from("pro_townships")
          .select("*", { count: "exact", head: true })
          .eq("pro_account_id", session.id)
          .eq("active", true);
        await updateStripeQuantity(account.stripe_subscription_id, count || 1);
      }
    } catch (e) {
      console.error("township add — stripe quantity update failed:", e.message);
    }

    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error: "Township key required." });

    const { data: existing } = await db
      .from("pro_townships")
      .select("id")
      .eq("pro_account_id", session.id)
      .eq("municipality_key", key)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: "Township not found." });

    // Check they won't drop to 0 active townships
    const { count: activeCount } = await db
      .from("pro_townships")
      .select("*", { count: "exact", head: true })
      .eq("pro_account_id", session.id)
      .eq("active", true);

    if ((activeCount || 0) <= 1)
      return res.status(400).json({ error: "Cannot remove your last township. Cancel your subscription to close the account." });

    await db.from("pro_townships").update({ active: false }).eq("id", existing.id);

    // Update Stripe quantity
    try {
      const { data: account } = await db
        .from("pro_accounts")
        .select("stripe_subscription_id")
        .eq("id", session.id)
        .single();
      if (account?.stripe_subscription_id) {
        const newCount = (activeCount || 1) - 1;
        await updateStripeQuantity(account.stripe_subscription_id, newCount);
      }
    } catch (e) {
      console.error("township remove — stripe quantity update failed:", e.message);
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
