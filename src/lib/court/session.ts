import type { SupabaseClient } from "@supabase/supabase-js";
import { conveneCourt } from "@/lib/court/jury";
import { adjustReputation, courtReputation, logDecision } from "@/lib/agents/reputation";
import { remember } from "@/lib/agents/memory";
import { notifyOwner } from "@/lib/notify";
import { isDemoOwner } from "@/lib/owners";
import type { CourtSession } from "@/lib/types";

/**
 * Hold a court session on a negotiation: the jury votes, the judge rules,
 * the ruling is logged (the village stages it at the court hall), both
 * parties' reputations move and both remember the case. Owners of the
 * agents involved are told the outcome.
 */
export async function holdCourt(
  supabase: SupabaseClient,
  negotiation_id: string
): Promise<{ session: CourtSession & { reputation_change?: { buyer: number; seller: number } } } | { error: string; status: number }> {
  const { data: neg, error } = await supabase
    .from("negotiations")
    .select(
      `*,
      buyer:agents!buyer_agent_id (id, name, budget, spent, policy, reputation, owner_id),
      seller:agents!seller_agent_id (id, name, budget, spent, policy, reputation, owner_id),
      listing:listings (id, title, price, category)`
    )
    .eq("id", negotiation_id)
    .single();

  if (error || !neg) return { error: "Negotiation not found", status: 404 };

  const session = await conveneCourt({
    negotiation_id,
    listing_title: neg.listing?.title || "Listing",
    listing_price: Number(neg.listing?.price || 0),
    category: neg.listing?.category,
    current_offer: neg.current_offer != null ? Number(neg.current_offer) : null,
    buyer_name: neg.buyer?.name || "Buyer",
    buyer_budget: Number(neg.buyer?.budget || 0),
    buyer_spent: Number(neg.buyer?.spent || 0),
    buyer_max: neg.buyer?.policy?.max_price,
    seller_name: neg.seller?.name || "Seller",
    seller_min: neg.seller?.policy?.min_price,
    seller_reputation: Number(neg.seller?.reputation || 50),
    buyer_reputation: Number(neg.buyer?.reputation || 50),
    messages: neg.messages || [],
  });

  if (!neg.buyer?.id) return { session };

  await logDecision(supabase, {
    agentId: neg.buyer.id,
    negotiationId: negotiation_id,
    role: "judge",
    actionType: "court",
    payload: {
      type: "court",
      message: session.judge_reason,
      verdict: session.judge_verdict,
      recommended_price: session.recommended_price,
      listing_id: neg.listing?.id ?? null,
      buyer_id: neg.buyer.id,
      seller_id: neg.seller?.id ?? null,
      votes: { accept: session.accept_count, reject: session.reject_count, counter: session.counter_count },
    },
    source: "rules",
  });

  if (!neg.seller?.id) return { session };

  // The verdict counts: it moves reputations and both agents remember it
  const deltas = courtReputation({
    verdict: session.judge_verdict,
    offer: neg.current_offer != null ? Number(neg.current_offer) : null,
    listingPrice: Number(neg.listing?.price || 0),
    recommended: session.recommended_price,
  });
  await adjustReputation(supabase, [
    { id: neg.buyer.id, delta: deltas.buyer },
    { id: neg.seller.id, delta: deltas.seller },
  ]);

  const ruling =
    session.judge_verdict === "accept"
      ? "ruled the deal fair"
      : session.judge_verdict === "reject"
        ? "threw the deal out"
        : `told us to settle near £${session.recommended_price ?? "?"}`;
  const item = neg.listing?.title || "a listing";
  const at = new Date().toISOString();
  await Promise.all([
    remember(supabase, neg.buyer.id, {
      at,
      negotiation_id,
      counterpart_id: neg.seller.id,
      counterpart_name: neg.seller.name,
      outcome: "court",
      text: `The court ${ruling} in my dispute with ${neg.seller.name} over ${item}.`,
    }),
    remember(supabase, neg.seller.id, {
      at,
      negotiation_id,
      counterpart_id: neg.buyer.id,
      counterpart_name: neg.buyer.name,
      outcome: "court",
      text: `The court ${ruling} in my dispute with ${neg.buyer.name} over ${item}.`,
    }),
  ]);

  for (const party of [neg.buyer, neg.seller]) {
    if (isDemoOwner(party.owner_id)) continue;
    const delta = party.id === neg.buyer.id ? deltas.buyer : deltas.seller;
    await notifyOwner(supabase, {
      ownerId: party.owner_id,
      agentId: party.id,
      negotiationId: negotiation_id,
      kind: "court",
      title: `Court: ${neg.buyer.name} v ${neg.seller.name}`,
      body: `The court ${ruling} over ${item}. ${party.name}'s reputation ${delta > 0 ? `rose by ${delta}` : delta < 0 ? `fell by ${-delta}` : "is unchanged"}.`,
      href: `/negotiate?id=${negotiation_id}`,
    });
  }

  return { session: { ...session, reputation_change: deltas } };
}
