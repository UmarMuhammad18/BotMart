import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideNextAction } from "@/lib/agents/negotiate";
import { NegotiationMessage } from "@/lib/types";

// GET all negotiations
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("negotiations")
      .select(`
        *,
        buyer:agents!buyer_agent_id (id, name, budget, spent),
        seller:agents!seller_agent_id (id, name, budget, spent),
        listing:listings (id, title, price)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST – start a new negotiation OR run the next turn
export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    // ===== START NEW NEGOTIATION =====
    if (body.action === "start") {
      const { buyer_agent_id, listing_id } = body;

      if (!buyer_agent_id || !listing_id) {
        return NextResponse.json(
          { error: "buyer_agent_id and listing_id are required" },
          { status: 400 }
        );
      }

      // Get listing + seller
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .select("*, seller:agents!seller_agent_id (*)")
        .eq("id", listing_id)
        .single();

      if (listingError || !listing) {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }

      // Get buyer
      const { data: buyer, error: buyerError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", buyer_agent_id)
        .single();

      if (buyerError || !buyer) {
        return NextResponse.json({ error: "Buyer agent not found" }, { status: 404 });
      }

      // Create negotiation record
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
        return NextResponse.json({ error: negError.message }, { status: 500 });
      }

      // Immediately run the first buyer turn
      const firstMessage = decideNextAction({
        name: buyer.name,
        budget: buyer.budget,
        spent: buyer.spent,
        role: "buyer",
        listingTitle: listing.title,
        listingPrice: listing.price,
        currentOffer: null,
        messages: [],
      });

      const messages = [firstMessage];

      const { data: updated, error: updateError } = await supabase
        .from("negotiations")
        .update({
          messages,
          current_offer: firstMessage.price || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", negotiation.id)
        .select(`
          *,
          buyer:agents!buyer_agent_id (id, name, budget, spent),
          seller:agents!seller_agent_id (id, name, budget, spent),
          listing:listings (id, title, price)
        `)
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json(updated, { status: 201 });
    }

    // ===== RUN NEXT TURN =====
    if (body.action === "next_turn") {
      const { negotiation_id } = body;

      if (!negotiation_id) {
        return NextResponse.json(
          { error: "negotiation_id is required" },
          { status: 400 }
        );
      }

      // Load full negotiation
      const { data: neg, error: negError } = await supabase
        .from("negotiations")
        .select(`
          *,
          buyer:agents!buyer_agent_id (*),
          seller:agents!seller_agent_id (*),
          listing:listings (*)
        `)
        .eq("id", negotiation_id)
        .single();

      if (negError || !neg) {
        return NextResponse.json({ error: "Negotiation not found" }, { status: 404 });
      }

      if (neg.status !== "open") {
        return NextResponse.json(
          { error: "Negotiation is already closed" },
          { status: 400 }
        );
      }

      const messages: NegotiationMessage[] = neg.messages || [];
      const lastMessage = messages[messages.length - 1];

      // Decide whose turn it is
      const nextRole = lastMessage?.from === "buyer" ? "seller" : "buyer";
      const agent = nextRole === "buyer" ? neg.buyer : neg.seller;

      const nextMessage = decideNextAction({
        name: agent.name,
        budget: agent.budget,
        spent: agent.spent,
        role: nextRole,
        listingTitle: neg.listing.title,
        listingPrice: neg.listing.price,
        currentOffer: neg.current_offer,
        messages,
      });

      const newMessages = [...messages, nextMessage];

      // Determine new status
      let newStatus = "open";
      if (nextMessage.type === "accept") {
        newStatus = "accepted";
      } else if (nextMessage.type === "reject") {
        newStatus = "rejected";
      }

      // If accepted, create an order and update budgets
      if (newStatus === "accepted" && nextMessage.price) {
        await supabase.from("orders").insert({
          negotiation_id: neg.id,
          buyer_agent_id: neg.buyer_agent_id,
          seller_agent_id: neg.seller_agent_id,
          listing_id: neg.listing_id,
          final_price: nextMessage.price,
          status: "paid",
        });

        // Update buyer spent
        await supabase
          .from("agents")
          .update({ spent: (neg.buyer.spent || 0) + nextMessage.price })
          .eq("id", neg.buyer_agent_id);

        // Reduce stock
        await supabase
          .from("listings")
          .update({ stock: Math.max(0, (neg.listing.stock || 1) - 1) })
          .eq("id", neg.listing_id);
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
        .select(`
          *,
          buyer:agents!buyer_agent_id (id, name, budget, spent),
          seller:agents!seller_agent_id (id, name, budget, spent),
          listing:listings (id, title, price)
        `)
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
