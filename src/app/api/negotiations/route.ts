import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runNextTurn, startNegotiation } from "@/lib/agents/session";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("negotiations")
      .select(`
        *,
        buyer:agents!buyer_agent_id (id, name, budget, spent, status),
        seller:agents!seller_agent_id (id, name, budget, spent, status),
        listing:listings (id, title, price)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (body.action === "start") {
      const buyer_agent_id = body.buyer_agent_id as string | undefined;
      const listing_id = body.listing_id as string | undefined;
      if (!buyer_agent_id || !listing_id) {
        return NextResponse.json(
          { error: "buyer_agent_id and listing_id are required" },
          { status: 400 }
        );
      }
      const result = await startNegotiation(supabase, buyer_agent_id, listing_id);
      if ("error" in result && result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json(result.data, { status: result.status });
    }

    if (body.action === "next_turn") {
      const negotiation_id = body.negotiation_id as string | undefined;
      if (!negotiation_id) {
        return NextResponse.json(
          { error: "negotiation_id is required" },
          { status: 400 }
        );
      }
      const result = await runNextTurn(supabase, negotiation_id);
      if ("error" in result && result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json(result.data);
    }

    return NextResponse.json(
      { error: "Invalid action. Use action: start | next_turn" },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[negotiations POST]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    // Never leak stack; always return JSON so the client can show a message
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
