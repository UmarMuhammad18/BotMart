import { decideAgentTurn } from "@/lib/agents/brain";
import { applyNegotiationOutcome, logDecision } from "@/lib/agents/reputation";
import { createTestPaymentIntent } from "@/lib/stripe";
import { relationshipWith, rememberNegotiation } from "@/lib/agents/memory";
import { notifyOwner } from "@/lib/notify";
import { holdCourt } from "@/lib/court/session";
import { isDemoOwner } from "@/lib/owners";
import { NegotiationMessage } from "@/lib/types";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Only select columns that exist on the live Supabase project.
 * Optional columns (trades_*, memory, goal, world_*) are applied via SQL migration
 * and must not break negotiations if missing.
 */
const NEG_SELECT = `
  *,
  buyer:agents!buyer_agent_id (id, name, budget, spent, policy, status, reputation, owner_id, memory),
  seller:agents!seller_agent_id (id, name, budget, spent, policy, status, reputation, owner_id, memory),
  listing:listings (id, title, price, stock, seller_agent_id, category)
`;

type Party = {
  id: string;
  name: string;
  budget: number;
  spent: number;
  policy?: Record<string, unknown>;
  owner_id?: string | null;
  memory?: unknown;
};

/** Owners can ask an agent to check with them before it buys anything. */
export function needsApproval(buyer: Pick<Party, "policy" | "owner_id">) {
  return buyer.policy?.require_approval === true && !isDemoOwner(buyer.owner_id);
}

type FinishNeg = {
  id: string;
  buyer_agent_id: string;
  seller_agent_id: string;
  buyer: Party;
  seller: Party;
  listing: { title: string; price: number };
};

/** Reputation, counters and both agents' memories for a finished negotiation. */
async function finishNegotiation(
  supabase: SupabaseClient,
  neg: FinishNeg,
  outcome: "accepted" | "rejected" | "escalated",
  messages: NegotiationMessage[],
  price?: number | null
) {
  await applyNegotiationOutcome(supabase, {
    buyerId: neg.buyer_agent_id,
    sellerId: neg.seller_agent_id,
    outcome,
  });
  if (neg.buyer && neg.seller) {
    await rememberNegotiation(supabase, {
      negotiationId: neg.id,
      buyer: neg.buyer,
      seller: neg.seller,
      listingTitle: neg.listing?.title || "an item",
      listingPrice: Number(neg.listing?.price || 0),
      messages,
      outcome,
      price,
    });
  }
}

function agentContext(
  agent: {
    name: string;
    budget: number;
    spent: number;
    policy?: Record<string, unknown>;
    memory?: unknown;
  },
  role: "buyer" | "seller",
  listing: { title: string; price: number },
  currentOffer: number | null,
  messages: NegotiationMessage[],
  counterpartId?: string
) {
  return {
    relationship: counterpartId ? relationshipWith(agent.memory, counterpartId) : undefined,
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
    .select("*, seller:agents!seller_agent_id (id, name, budget, spent, policy, status, reputation, memory)")
    .eq("id", listing_id)
    .single();

  if (listingError || !listing) {
    return { error: "Listing not found", status: 404 as const };
  }

  const { data: buyer, error: buyerError } = await supabase
    .from("agents")
    .select("id, name, budget, spent, policy, status, reputation, memory")
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

  if (listing.status !== "active" || (listing.stock ?? 0) < 1) {
    return { error: "Listing is sold out", status: 409 as const };
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

  const { move: firstMessage, source } = await decideAgentTurn(
    agentContext(buyer, "buyer", listing, null, [], listing.seller_agent_id)
  );

  await logDecision(supabase, {
    agentId: buyer.id,
    negotiationId: negotiation.id,
    role: "buyer",
    actionType: firstMessage.type,
    payload: firstMessage,
    source,
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

    await finishNegotiation(supabase, neg, "escalated", neg.messages || []);

    return {
      error: "An agent was paused or blocked. Negotiation escalated.",
      status: 400 as const,
    };
  }

  const messages: NegotiationMessage[] = neg.messages || [];
  const lastMessage = messages[messages.length - 1];
  const nextRole = lastMessage?.from === "buyer" ? "seller" : "buyer";
  const agent = nextRole === "buyer" ? neg.buyer : neg.seller;

  const { move: nextMessage, source } = await decideAgentTurn(
    agentContext(
      agent,
      nextRole,
      neg.listing,
      neg.current_offer,
      messages,
      nextRole === "buyer" ? neg.seller_agent_id : neg.buyer_agent_id
    )
  );

  await logDecision(supabase, {
    agentId: agent.id,
    negotiationId: negotiation_id,
    role: nextRole,
    actionType: nextMessage.type,
    payload: nextMessage,
    source,
  });

  const newMessages = [...messages, nextMessage];

  let newStatus: string =
    nextMessage.type === "counter" ? "countered" : "open";
  if (nextMessage.type === "accept") newStatus = "accepted";
  if (nextMessage.type === "reject") newStatus = "rejected";
  if (newStatus === "open" && newMessages.length >= 14) newStatus = "escalated";

  let stripePaymentIntentId: string | null = null;

  // The owner asked to approve purchases: pause here instead of settling
  if (newStatus === "accepted" && nextMessage.price && needsApproval(neg.buyer)) {
    return requestApproval(supabase, neg, nextMessage.price, newMessages);
  }

  if (newStatus === "accepted" && nextMessage.price) {
    const settled = await settleDeal(supabase, neg, nextMessage.price, newMessages);

    if ("error" in settled) {
      // Stock ran out or budget was spent by a concurrent deal — close it out.
      await supabase
        .from("negotiations")
        .update({
          messages: newMessages,
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", negotiation_id);
      await finishNegotiation(supabase, neg, "rejected", newMessages);
      return { error: settled.error, status: 409 as const };
    }

    stripePaymentIntentId = settled.stripePaymentIntentId;
  }

  if (
    newStatus === "accepted" ||
    newStatus === "rejected" ||
    newStatus === "escalated"
  ) {
    await finishNegotiation(
      supabase,
      neg,
      newStatus as "accepted" | "rejected" | "escalated",
      newMessages,
      newStatus === "accepted" ? nextMessage.price : null
    );
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

  // Talks that went round in circles are a dispute: take it to court
  if (newStatus === "escalated") {
    try {
      await holdCourt(supabase, negotiation_id);
    } catch (err) {
      console.error("[court] automatic session failed", err);
    }
  }

  return {
    data: { ...updated, stripe_payment_intent_id: stripePaymentIntentId },
    status: 200 as const,
  };
}

type SettleNeg = {
  id: string;
  buyer_agent_id: string;
  seller_agent_id: string;
  listing_id: string;
  buyer: { spent: number; budget: number };
  listing: { stock: number | null };
};

/**
 * Settle an accepted deal: order + buyer debit + stock decrement in one
 * transaction (settle_negotiation in schema.sql), then take a Stripe test
 * payment. The charge happens only after settlement succeeds, so a deal that
 * loses a race for the last unit is never charged.
 */
export async function settleDeal(
  supabase: SupabaseClient,
  neg: SettleNeg,
  price: number,
  messages: NegotiationMessage[]
): Promise<{ orderId: string; stripePaymentIntentId: string | null } | { error: string }> {
  const { data: orderId, error } = await supabase.rpc("settle_negotiation", {
    p_negotiation_id: neg.id,
    p_price: price,
    p_messages: messages,
  });

  let id = orderId as string | null;

  if (error) {
    // Function not deployed yet (schema.sql not re-run) → legacy path
    if (error.code === "PGRST202" || error.code === "42883") {
      console.warn("[settle] settle_negotiation() missing — run supabase/schema.sql. Using non-atomic fallback.");
      id = await legacySettle(supabase, neg, price);
    } else {
      return { error: error.message };
    }
  }

  if (!id) return { error: "Settlement failed" };

  const payment = await createTestPaymentIntent(price);
  await supabase
    .from("orders")
    .update(
      payment
        ? { status: payment.orderStatus, stripe_payment_intent_id: payment.id }
        : // No Stripe configured → simulated payment
          { status: "paid" }
    )
    .eq("id", id);

  return { orderId: id, stripePaymentIntentId: payment?.id ?? null };
}

/**
 * Pre-RPC behaviour, kept only until the SQL is applied. Re-checks stock and
 * budget, which covers sequential flows (auctions), but still races under
 * true concurrency.
 */
async function legacySettle(
  supabase: SupabaseClient,
  neg: SettleNeg,
  price: number
): Promise<string | null> {
  const [{ data: listing }, { data: buyer }] = await Promise.all([
    supabase.from("listings").select("stock, status").eq("id", neg.listing_id).single(),
    supabase.from("agents").select("spent, budget").eq("id", neg.buyer_agent_id).single(),
  ]);
  if (!listing || listing.status !== "active" || (listing.stock ?? 0) < 1) return null;
  if (!buyer || Number(buyer.spent || 0) + price > Number(buyer.budget || 0)) return null;

  const { data: order } = await supabase
    .from("orders")
    .insert({
      negotiation_id: neg.id,
      buyer_agent_id: neg.buyer_agent_id,
      seller_agent_id: neg.seller_agent_id,
      listing_id: neg.listing_id,
      final_price: price,
      status: "pending",
    })
    .select("id")
    .single();

  await supabase
    .from("agents")
    .update({ spent: Number(buyer.spent || 0) + price })
    .eq("id", neg.buyer_agent_id);

  const nextStock = Math.max(0, Number(listing.stock) - 1);
  await supabase
    .from("listings")
    .update({ stock: nextStock, status: nextStock === 0 ? "sold" : "active" })
    .eq("id", neg.listing_id);

  return order?.id ?? null;
}

/**
 * Pause an agreed deal for the buyer's owner: the negotiation waits as
 * awaiting_approval at the agreed price, and the owner is notified.
 */
async function requestApproval(
  supabase: SupabaseClient,
  neg: { id: string; buyer: Party; listing: { title: string; price: number } },
  price: number,
  messages: NegotiationMessage[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ error: string; status: 500 } | { data: any; status: 200 }> {
  const now = new Date().toISOString();
  const base = { messages, current_offer: price, status: "awaiting_approval", updated_at: now };
  let res = await supabase
    .from("negotiations")
    .update({ ...base, approval_requested_at: now })
    .eq("id", neg.id)
    .select(NEG_SELECT)
    .single();
  // approval_requested_at not migrated yet: save without it
  if (res.error) {
    res = await supabase.from("negotiations").update(base).eq("id", neg.id).select(NEG_SELECT).single();
  }
  if (res.error) return { error: res.error.message, status: 500 };

  if (neg.buyer.owner_id) {
    const asking = Number(neg.listing.price);
    const saved = asking > price ? ` (asking £${asking}, so £${Math.round(asking - price)} off)` : "";
    await notifyOwner(supabase, {
      ownerId: neg.buyer.owner_id,
      agentId: neg.buyer.id,
      negotiationId: neg.id,
      kind: "approval",
      title: `${neg.buyer.name} found a deal: ${neg.listing.title} for £${price}`,
      body: `${neg.buyer.name} agreed £${price} for ${neg.listing.title}${saved}. Approve the purchase, or decline and it walks away.`,
      data: { price, listing_title: neg.listing.title, asking },
      href: `/negotiate?id=${neg.id}`,
    });
  }
  return { data: res.data, status: 200 };
}

/**
 * The owner's answer to an approval request. Approve settles the deal at the
 * agreed price (the same atomic settlement as any deal); decline closes it.
 */
export async function resolveApproval(
  supabase: SupabaseClient,
  negotiation_id: string,
  decision: "approve" | "decline"
) {
  const { data: neg, error } = await supabase
    .from("negotiations")
    .select(NEG_SELECT)
    .eq("id", negotiation_id)
    .single();
  if (error || !neg) return { error: "Negotiation not found", status: 404 as const };
  if (neg.status !== "awaiting_approval") {
    return { error: "This deal is no longer waiting for approval", status: 409 as const };
  }

  const price = Number(neg.current_offer);
  const now = new Date().toISOString();
  const closing: NegotiationMessage =
    decision === "approve"
      ? { from: "buyer", type: "accept", price, message: `Approved by my owner. Deal at £${price}.`, timestamp: now }
      : { from: "buyer", type: "reject", message: "My owner passed on this one. Thanks anyway.", timestamp: now };
  const all: NegotiationMessage[] = [...(neg.messages || []), closing];

  let failure: string | null = null;
  let paymentId: string | null = null;
  if (decision === "approve") {
    const settled = await settleDeal(supabase, neg, price, all);
    if ("error" in settled) failure = settled.error;
    else paymentId = settled.stripePaymentIntentId;
  }
  const outcome = decision === "approve" && !failure ? "accepted" : "rejected";

  // settle_negotiation() already marked an approved deal accepted; this also
  // covers the legacy settlement path and declines
  await supabase
    .from("negotiations")
    .update({ status: outcome, messages: all, updated_at: now, ...(outcome === "accepted" ? { current_offer: price } : {}) })
    .eq("id", negotiation_id);
  await finishNegotiation(supabase, neg, outcome, all, outcome === "accepted" ? price : null);

  try {
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("negotiation_id", negotiation_id)
      .eq("kind", "approval")
      .is("read_at", null);
  } catch {
    // optional table
  }

  if (failure) return { error: `Couldn't complete the purchase: ${failure}`, status: 409 as const };
  const { data } = await supabase.from("negotiations").select(NEG_SELECT).eq("id", negotiation_id).single();
  return { data: { ...data, stripe_payment_intent_id: paymentId }, status: 200 as const };
}
