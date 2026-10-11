import { createAdminClient } from "@/lib/supabase/admin";
import type { NegotiationMessage } from "@/lib/types";

export type RecentDeal = {
  id: string;
  finalPrice: number;
  buyerName: string;
  sellerName: string;
  listingTitle: string;
  createdAt: string;
};

/** A real, finished negotiation transcript for the landing preview. */
export type LatestNegotiation = {
  listingTitle: string;
  buyerName: string;
  sellerName: string;
  messages: NegotiationMessage[];
};

export type LandingStats = {
  agentCount: number;
  activeAgentCount: number;
  listingCount: number;
  dealCount: number;
  totalValue: number;
  recentDeals: RecentDeal[];
  latestNegotiation: LatestNegotiation | null;
};

const EMPTY_STATS: LandingStats = {
  agentCount: 0,
  activeAgentCount: 0,
  listingCount: 0,
  dealCount: 0,
  totalValue: 0,
  recentDeals: [],
  latestNegotiation: null,
};

/**
 * Pulls real, live counts from Supabase for the landing page's social-proof
 * strip and activity feed. Falls back to zeroed stats if the database isn't
 * reachable or hasn't been seeded yet — the UI treats that as an empty state,
 * never as fabricated numbers.
 */
export async function getLandingStats(): Promise<LandingStats> {
  try {
    const supabase = createAdminClient();

    const [agentsRes, listingsRes, ordersCountRes, ordersRes, negRes] = await Promise.all([
      supabase.from("agents").select("id, status", { count: "exact" }),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("orders").select("final_price, buyer_agent_id, seller_agent_id"),
      supabase
        .from("orders")
        .select(`
          id, final_price, created_at, buyer_agent_id, seller_agent_id,
          buyer:agents!buyer_agent_id (name),
          seller:agents!seller_agent_id (name),
          listing:listings (title)
        `)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("negotiations")
        .select(`
          messages,
          buyer:agents!buyer_agent_id (name),
          seller:agents!seller_agent_id (name),
          listing:listings (title)
        `)
        .eq("status", "accepted")
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

    const agents = agentsRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const allOrders = (ordersCountRes.data ?? []).filter(
      (o) => o.buyer_agent_id !== o.seller_agent_id
    );

    const totalValue = allOrders.reduce((sum, o) => sum + Number(o.final_price || 0), 0);

    // Legacy self-trades (agent bought its own listing) aren't real deals
    const recentDeals: RecentDeal[] = orders
      .filter((o) => o.buyer_agent_id !== o.seller_agent_id)
      .slice(0, 4)
      .map((o) => ({
        id: o.id,
        finalPrice: Number(o.final_price || 0),
        buyerName: (o.buyer as unknown as { name: string } | null)?.name ?? "Buyer agent",
        sellerName: (o.seller as unknown as { name: string } | null)?.name ?? "Seller agent",
        listingTitle: (o.listing as unknown as { title: string } | null)?.title ?? "listing",
        createdAt: o.created_at,
      }));

    // Most recent accepted deal with a real back-and-forth (not a self-trade)
    type NegRow = {
      messages: NegotiationMessage[] | null;
      buyer: { name: string } | null;
      seller: { name: string } | null;
      listing: { title: string } | null;
    };
    const neg = ((negRes.data ?? []) as unknown as NegRow[]).find(
      (n) => (n.messages?.length ?? 0) >= 3 && n.buyer?.name !== n.seller?.name
    );
    const latestNegotiation: LatestNegotiation | null = neg
      ? {
          listingTitle: neg.listing?.title ?? "listing",
          buyerName: neg.buyer?.name ?? "Buyer agent",
          sellerName: neg.seller?.name ?? "Seller agent",
          messages: (neg.messages ?? []).slice(-4),
        }
      : null;

    return {
      agentCount: agentsRes.count ?? agents.length,
      activeAgentCount: agents.filter((a) => a.status === "active").length,
      listingCount: listingsRes.count ?? 0,
      dealCount: allOrders.length,
      totalValue,
      recentDeals,
      latestNegotiation,
    };
  } catch {
    return EMPTY_STATS;
  }
}
