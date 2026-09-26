import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractSearchFilters } from "@/lib/ai";
import { applyFilters, rankListings, SearchFilters } from "@/lib/marketplace/match";
import { ListingWithSeller } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { buyer_agent_id, goal } = body as {
      buyer_agent_id?: string;
      goal?: string;
    };

    if (!buyer_agent_id || !goal) {
      return NextResponse.json(
        { error: "buyer_agent_id and goal are required" },
        { status: 400 }
      );
    }

    const { data: buyer, error: buyerError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", buyer_agent_id)
      .single();

    if (buyerError || !buyer) {
      return NextResponse.json({ error: "Buyer agent not found" }, { status: 404 });
    }

    const extracted = await extractSearchFilters(goal, buyer.policy || {});

    const filters: SearchFilters = {
      keywords: extracted?.keywords || goal,
      maxPrice:
        extracted?.maxPrice ||
        (buyer.policy as { max_price?: number } | null)?.max_price ||
        Number(buyer.budget) - Number(buyer.spent),
      category: extracted?.category || undefined,
    };

    const { data, error } = await supabase
      .from("listings")
      .select(`
        *,
        seller:agents!seller_agent_id (id, name, reputation, status)
      `)
      .eq("status", "active");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = applyFilters((data || []) as ListingWithSeller[], filters);
    const ranked = rankListings(filtered, buyer).filter(
      (l) => l.seller_agent_id !== buyer.id
    );

    return NextResponse.json({ filters, listings: ranked });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
