import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyFilters, rankListings, SearchFilters } from "@/lib/marketplace/match";
import { ListingWithSeller } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const maxPrice = searchParams.get("maxPrice");
    const category = searchParams.get("category") || "";
    const buyerAgentId = searchParams.get("buyer_agent_id");

    const { data, error } = await supabase
      .from("listings")
      .select(`
        *,
        seller:agents!seller_agent_id (id, name, reputation)
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filters: SearchFilters = {
      keywords: q,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      category: category || undefined,
    };

    let listings = applyFilters((data || []) as ListingWithSeller[], filters);

    if (buyerAgentId) {
      const { data: buyer } = await supabase
        .from("agents")
        .select("*")
        .eq("id", buyerAgentId)
        .single();
      if (buyer) {
        listings = rankListings(listings, buyer);
      }
    }

    return NextResponse.json(listings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { seller_agent_id, title, description, price, category, stock } = body;

    if (!seller_agent_id || !title || !price) {
      return NextResponse.json(
        { error: "seller_agent_id, title and price are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("listings")
      .insert({
        seller_agent_id,
        title,
        description: description || null,
        price,
        category: category || null,
        stock: stock || 1,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
