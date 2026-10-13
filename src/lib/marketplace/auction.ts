import { SupabaseClient } from "@supabase/supabase-js";
import { startNegotiation, runNextTurn } from "@/lib/agents/session";
import { rankListings } from "@/lib/marketplace/match";
import { Agent, ListingWithSeller } from "@/lib/types";

export type AuctionResult = {
  listing_id: string;
  listing_title: string;
  participants: string[];
  negotiations: {
    id: string;
    buyer: string;
    status: string;
    final_price?: number;
  }[];
  winner?: { buyer: string; price: number; negotiation_id: string };
};

/**
 * Multi-buyer "auction": top N eligible buyers each open a negotiation
 * on the same listing; we run them to completion and pick the best accepted price.
 * (Seller can only fulfil one unit — other accepts are treated as outbid.)
 */
export async function runListingAuction(
  supabase: SupabaseClient,
  listingId: string,
  opts: {
    maxBuyers?: number;
    /** PostgREST `or` filter limiting which buyers may bid */
    ownerFilter?: string;
  } = {}
): Promise<AuctionResult> {
  const maxBuyers = opts.maxBuyers ?? 3;

  const { data: listing, error } = await supabase
    .from("listings")
    .select(`*, seller:agents!seller_agent_id (id, name, reputation, status)`)
    .eq("id", listingId)
    .single();

  if (error || !listing) {
    throw new Error("Listing not found");
  }

  if (listing.status !== "active" || (listing.stock ?? 0) < 1) {
    throw new Error("Listing not available for auction");
  }

  let buyerQuery = supabase
    .from("agents")
    .select("*")
    .eq("status", "active")
    .neq("id", listing.seller_agent_id);
  if (opts.ownerFilter) buyerQuery = buyerQuery.or(opts.ownerFilter);
  const { data: buyers } = await buyerQuery;

  // Score buyers by how well this listing fits them
  const scoredBuyers = (buyers || [])
    .map((buyer) => {
      const [scored] = rankListings([listing as ListingWithSeller], buyer as Agent);
      return { buyer: buyer as Agent, score: scored?.match_score ?? 0 };
    })
    .filter((b) => b.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxBuyers);

  const negotiations: AuctionResult["negotiations"] = [];
  const accepted: { buyer: string; price: number; negotiation_id: string }[] =
    [];

  for (const { buyer } of scoredBuyers) {
    const start = await startNegotiation(supabase, buyer.id, listingId);
    // Sold out to an earlier bidder → the race is over
    if ("error" in start && start.error) {
      if (start.status === 409) break;
      continue;
    }
    if (!start.data) continue;

    let current = start.data;
    let safety = 0;
    while (
      (current.status === "open" || current.status === "countered") &&
      safety < 14
    ) {
      const turn = await runNextTurn(supabase, current.id);
      if ("error" in turn) break;
      if (!turn.data) break;
      current = turn.data;
      safety++;
    }

    negotiations.push({
      id: current.id,
      buyer: buyer.name,
      status: current.status,
      final_price: current.current_offer ?? undefined,
    });

    if (current.status === "accepted" && current.current_offer) {
      accepted.push({
        buyer: buyer.name,
        price: Number(current.current_offer),
        negotiation_id: current.id,
      });
    }
  }

  // Highest accepted price wins conceptually (first settlement already took stock)
  accepted.sort((a, b) => b.price - a.price);

  return {
    listing_id: listingId,
    listing_title: listing.title,
    participants: scoredBuyers.map((b) => b.buyer.name),
    negotiations,
    winner: accepted[0],
  };
}
