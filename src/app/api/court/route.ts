import { NextRequest, NextResponse } from "next/server";
import { conveneCourt } from "@/lib/court/jury";
import { createClient } from "@/lib/supabase/server";
import { logDecision } from "@/lib/agents/reputation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const negotiation_id = body.negotiation_id as string | undefined;
    if (!negotiation_id) {
      return NextResponse.json(
        { error: "negotiation_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: neg, error } = await supabase
      .from("negotiations")
      .select(
        `*,
        buyer:agents!buyer_agent_id (id, name, budget, spent, policy, reputation),
        seller:agents!seller_agent_id (id, name, budget, spent, policy, reputation),
        listing:listings (id, title, price, category)`
      )
      .eq("id", negotiation_id)
      .single();

    if (error || !neg) {
      return NextResponse.json(
        { error: "Negotiation not found" },
        { status: 404 }
      );
    }

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

    // Log court outcome for observability / world feed
    if (neg.buyer?.id) {
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
        },
        source: "rules",
      });
    }

    return NextResponse.json(session);
  } catch (err) {
    console.error("[court]", err);
    return NextResponse.json(
      { error: "Court session failed" },
      { status: 500 }
    );
  }
}
