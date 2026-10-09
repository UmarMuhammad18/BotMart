import { decideAgentTurn } from "@/lib/agents/brain";
import { applyNegotiationOutcome, logDecision } from "@/lib/agents/reputation";
import { createTestPaymentIntent } from "@/lib/stripe";
import { NegotiationMessage } from "@/lib/types";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Only select columns that exist on the live Supabase project.
 * Optional columns (trades_*, memory, goal, world_*) are applied via SQL migration
 * and must not break negotiations if missing.
 */
const NEG_SELECT = `
  *,
  buyer:agents!buyer_agent_id (id, name, budget, spent, policy, status, reputation),
  seller:agents!seller_agent_id (id, name, budget, spent, policy, status, reputation),
  listing:listings (id, title, price, stock, seller_agent_id, category)
`;

function agentContext(
  agent: {
    name: string;
    budget: number;
    spent: number;
    policy?: Record<string, unknown>;
  },
  role: "buyer" | "seller",
  listing: { title: string; price: number },
  currentOffer: number | null,
  messages: NegotiationMessage[]
) {
  return {
    name: agent.name,
    budget: Number(agent.budget),
    spent: Number(agent.spent),
    policy: agent.policy || {},
    role,
    listingTitle: listing.title,
    listingPrice: Number(listing.price),
    currentOffer,
    messages,
  };
}

export async function startNegotiation(
  supabase: SupabaseClient,
  buyer_agent_id: string,
  listing_id: string
) {
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*, seller:agents!seller_agent_id (id, name, budget, spent, policy, status, reputation)")
    .eq("id", listing_id)
    .single();

  if (listingError || !listing) {
    return { error: "Listing not found", status: 404 as const };
  }

  const { data: buyer, error: buyerError } = await supabase
    .from("agents")
    .select("id, name, budget, spent, policy, status, reputation")
    .eq("id", buyer_agent_id)
    .single();

  if (buyerError || !buyer) {
    return { error: "Buyer agent not found", status: 404 as const };
  }

  if (buyer.status !== "active") {
    return { error: "Buyer agent is paused or blocked", status: 400 as const };
  }

  if (listing.seller?.status && listing.seller.status !== "active") {
    return { error: "Seller agent is paused or blocked", status: 400 as const };
  }

  if (buyer.id === listing.seller_agent_id) {
    return {
      error: "Buyer and seller must be different agents",
      status: 400 as const,
    };
  }

  const { data: negotiation, error: negError } = await supabase
    .from("negotiations")
    .insert({
      buyer_agent_id,
      seller_agent_id: listing.seller_agent_id,
      listing_id,
      status: "open",
      current_offer: null,
      messages: [],
    })
    .select()
    .single();

  if (negError) {
    return { error: negError.message, status: 500 as const };
  }

  const firstMessage = await decideAgentTurn(
    agentContext(buyer, "buyer", listing, null, [])
  );

  await logDecision(supabase, {
    agentId: buyer.id,
    negotiationId: negotiation.id,
    role: "buyer",
    actionType: firstMessage.type,
    payload: firstMessage,
    source: "grok",
  });

  const { data: updated, error: updateError } = await supabase
    .from("negotiations")
    .update({
      messages: [firstMessage],
      current_offer: firstMessage.price || null,
      status: firstMessage.type === "counter" ? "countered" : "open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", negotiation.id)
    .select(NEG_SELECT)
    .single();

  if (updateError) {
    return { error: updateError.message, status: 500 as const };
  }

  return { data: updated, status: 201 as const };
}

export async function runNextTurn(
  supabase: SupabaseClient,
  negotiation_id: string
) {
  const { data: neg, error: negError } = await supabase
    .from("negotiations")
    .select(NEG_SELECT)
    .eq("id", negotiation_id)
    .single();

  if (negError || !neg) {
    return { error: "Negotiation not found", status: 404 as const };
  }

  if (neg.status !== "open" && neg.status !== "countered") {
    return { error: "Negotiation is already closed", status: 400 as const };
  }

  if (neg.buyer?.status !== "active" || neg.seller?.status !== "active") {
    await supabase
      .from("negotiations")
      .update({
        status: "escalated",
        updated_at: new Date().toISOString(),
      })
      .eq("id", negotiation_id);

    await applyNegotiationOutcome(supabase, {
      buyerId: neg.buyer_agent_id,
      sellerId: neg.seller_agent_id,
      outcome: "escalated",
    });

    return {
      error: "An agent was paused or blocked. Negotiation escalated.",
      status: 400 as const,
    };
  }

  const messages: NegotiationMessage[] = neg.messages || [];
  const lastMessage = messages[messages.length - 1];
  const nextRole = lastMessage?.from === "buyer" ? "seller" : "buyer";
  const agent = nextRole === "buyer" ? neg.buyer : neg.seller;

  const nextMessage = await decideAgentTurn(
    agentContext(agent, nextRole, neg.listing, neg.current_offer, messages)
  );

  await logDecision(supabase, {
    agentId: agent.id,
    negotiationId: negotiation_id,
    role: nextRole,
    actionType: nextMessage.type,
    payload: nextMessage,
    source: "grok",
  });

  const newMessages = [...messages, nextMessage];

  let newStatus: string =
    nextMessage.type === "counter" ? "countered" : "open";
  if (nextMessage.type === "accept") newStatus = "accepted";
  if (nextMessage.type === "reject") newStatus = "rejected";
  if (newStatus === "open" && newMessages.length >= 14) newStatus = "escalated";

  let stripePaymentIntentId: string | null = null;

  if (newStatus === "accepted" && nextMessage.price) {
    stripePaymentIntentId = await createTestPaymentIntent(nextMessage.price);

    const orderRow: Record<string, unknown> = {
      negotiation_id: neg.id,
      buyer_agent_id: neg.buyer_agent_id,
      seller_agent_id: neg.seller_agent_id,
      listing_id: neg.listing_id,
      final_price: nextMessage.price,
      status: "paid",
    };
    if (stripePaymentIntentId) {
      orderRow.stripe_payment_intent_id = stripePaymentIntentId;
    }

    const { error: orderError } = await supabase.from("orders").insert(orderRow);
    if (orderError && stripePaymentIntentId) {
      delete orderRow.stripe_payment_intent_id;
      await supabase.from("orders").insert(orderRow);
    }

    await supabase
      .from("agents")
      .update({
        spent: (Number(neg.buyer.spent) || 0) + nextMessage.price,
      })
      .eq("id", neg.buyer_agent_id);

    const nextStock = Math.max(0, (neg.listing.stock || 1) - 1);
    await supabase
      .from("listings")
      .update({
        stock: nextStock,
        status: nextStock === 0 ? "sold" : "active",
      })
      .eq("id", neg.listing_id);
  }

  if (
    newStatus === "accepted" ||
    newStatus === "rejected" ||
    newStatus === "escalated"
  ) {
    await applyNegotiationOutcome(supabase, {
      buyerId: neg.buyer_agent_id,
      sellerId: neg.seller_agent_id,
      outcome: newStatus as "accepted" | "rejected" | "escalated",
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("negotiations")
    .update({
      messages: newMessages,
      current_offer: nextMessage.price || neg.current_offer,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", negotiation_id)
    .select(NEG_SELECT)
    .single();

  if (updateError) {
    return { error: updateError.message, status: 500 as const };
  }

  return {
    data: { ...updated, stripe_payment_intent_id: stripePaymentIntentId },
    status: 200 as const,
  };
}
