import Stripe from "stripe";

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export type TestPayment = {
  id: string;
  /** Order status this payment maps to. */
  orderStatus: "paid" | "pending";
};

/**
 * Create a PaymentIntent for a settled deal.
 * In test mode it is confirmed immediately with Stripe's test Visa card, so
 * the order reflects a real (test) charge. With a live key it is left
 * unconfirmed and the webhook moves the order to paid/cancelled.
 */
export async function createTestPaymentIntent(
  amountGbp: number
): Promise<TestPayment | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || amountGbp <= 0) return null;

  const testMode = key.startsWith("sk_test_");

  try {
    const stripe = new Stripe(key);
    const intent = await stripe.paymentIntents.create({
      amount: Math.max(50, Math.round(amountGbp * 100)),
      currency: "gbp",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { source: "botmart" },
      ...(testMode ? { confirm: true, payment_method: "pm_card_visa" } : {}),
    });
    return {
      id: intent.id,
      orderStatus: intent.status === "succeeded" ? "paid" : "pending",
    };
  } catch (err) {
    console.error("Stripe PaymentIntent failed", err);
    return null;
  }
}
