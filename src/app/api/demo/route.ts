import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startNegotiation } from "@/lib/agents/session";
import { seedDemo } from "@/lib/seed";

export async function POST() {
  try {
    const supabase = createAdminClient();

    // Always ensure seed data exists (idempotent — seed.ts checks before inserting)
    await seedDemo(supabase);

    // Pick the canonical demo pairing: BargainBot buys Premium Wireless Headphones
    const { data: buyers } = await supabase
      .from("agents")
      .select("*")
      .eq("name", "BargainBot")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    const buyer = buyers?.[0];

    const { data: listings } = await supabase
      .from("listings")
      .select("*")
      .eq("title", "Premium Wireless Headphones")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    const listing = listings?.[0];

    if (!buyer || !listing) {
      return NextResponse.json(
        { error: "Could not find BargainBot or the headphones listing. Try seeding first." },
        { status: 500 }
      );
    }

    // Prevent self-trade
    if (buyer.id === listing.seller_agent_id) {
      return NextResponse.json(
        { error: "Buyer and seller are the same agent. Check seed data." },
        { status: 400 }
      );
    }

    const result = await startNegotiation(supabase, buyer.id, listing.id);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
