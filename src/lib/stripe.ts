import Stripe from "stripe";

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createTestPaymentIntent(amountGbp: number) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || amountGbp <= 0) return null;

  try {
    const stripe = new Stripe(key);
    const intent = await stripe.paymentIntents.create({
      amount: Math.max(50, Math.round(amountGbp * 100)),
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      metadata: { source: "botmart" },
    });
    return intent.id;
  } catch (err) {
    console.error("Stripe PaymentIntent failed", err);
    return null;
  }
}
