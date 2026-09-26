import { createAdminClient } from "@/lib/supabase/admin";

export type RecentDeal = {
  id: string;
  finalPrice: number;
  buyerName: string;
  sellerName: string;
  listingTitle: string;
  createdAt: string;
};

export type LandingStats = {
  agentCount: number;
  activeAgentCount: number;
  listingCount: number;
  dealCount: number;
  totalValue: number;
  recentDeals: RecentDeal[];
};

const EMPTY_STATS: LandingStats = {
  agentCount: 0,
  activeAgentCount: 0,
  listingCount: 0,
  dealCount: 0,
  totalValue: 0,
  recentDeals: [],
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

    const [agentsRes, listingsRes, ordersCountRes, ordersRes] = await Promise.all([
      supabase.from("agents").select("id, status", { count: "exact" }),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("orders").select("final_price", { count: "exact" }),
      supabase
        .from("orders")
        .select(`
          id, final_price, created_at,
          buyer:agents!buyer_agent_id (name),
          seller:agents!seller_agent_id (name),
          listing:listings (title)
        `)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    const agents = agentsRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const allOrders = ordersCountRes.data ?? [];

    const totalValue = allOrders.reduce((sum, o) => sum + Number(o.final_price || 0), 0);

    const recentDeals: RecentDeal[] = orders.map((o) => ({
      id: o.id,
      finalPrice: Number(o.final_price || 0),
      buyerName: (o.buyer as unknown as { name: string } | null)?.name ?? "Buyer agent",
      sellerName: (o.seller as unknown as { name: string } | null)?.name ?? "Seller agent",
      listingTitle: (o.listing as unknown as { title: string } | null)?.title ?? "listing",
      createdAt: o.created_at,
    }));

    return {
      agentCount: agentsRes.count ?? agents.length,
      activeAgentCount: agents.filter((a) => a.status === "active").length,
      listingCount: listingsRes.count ?? 0,
      dealCount: ordersCountRes.count ?? allOrders.length,
      totalValue,
      recentDeals,
    };
  } catch {
    return EMPTY_STATS;
  }
}
