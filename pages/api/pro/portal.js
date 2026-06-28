// POST — create a Stripe Customer Portal session and return the URL.

import Stripe from "stripe";
import { getProSession } from "../../../lib/proAuth";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pro.townhallcafe.org";

function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-05-28.basil" });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getProSession(req);
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  if (!session.stripe_customer_id) return res.status(400).json({ error: "No billing account found." });

  try {
    const portalSession = await stripe().billingPortal.sessions.create({
      customer: session.stripe_customer_id,
      return_url: `${SITE}/dashboard`,
    });
    return res.status(200).json({ url: portalSession.url });
  } catch (err) {
    console.error("portal:", err.message);
    return res.status(502).json({ error: "Could not open billing portal." });
  }
}
