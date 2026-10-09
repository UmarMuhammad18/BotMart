import { NextResponse } from "next/server";
import { buildWorldSnapshot } from "@/lib/world/layout";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const [agentsRes, listingsRes, negRes, decisionsRes] = await Promise.all([
      supabase.from("agents").select("*").order("created_at", { ascending: true }),
      supabase
        .from("listings")
        .select("*, seller:agents!seller_agent_id (name)")
        .eq("status", "active"),
      supabase
        .from("negotiations")
        .select("buyer_agent_id, seller_agent_id")
        .in("status", ["open", "countered"]),
      supabase
        .from("agent_decisions")
        .select("id, agent_id, action_type, payload, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (agentsRes.error) {
      return NextResponse.json(
        { error: agentsRes.error.message },
        { status: 500 }
      );
    }

    const snapshot = buildWorldSnapshot({
      agents: agentsRes.data || [],
      listings: listingsRes.data || [],
      openNegotiations: negRes.data || [],
      recentDecisions: decisionsRes.data || [],
    });

    return NextResponse.json(snapshot);
  } catch (err) {
    console.error("[world]", err);
    return NextResponse.json(
      { error: "Failed to load world snapshot" },
      { status: 500 }
    );
  }
}
