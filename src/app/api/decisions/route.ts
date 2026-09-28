import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** GET /api/decisions?agent_id=...&limit=50 */
export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agent_id");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

    let query = supabase
      .from("agent_decisions")
      .select("*, agent:agents(id, name)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (agentId) {
      query = query.eq("agent_id", agentId);
    }

    const { data, error } = await query;

    if (error) {
      // Table may not exist yet before schema migration
      return NextResponse.json({ error: error.message, data: [] }, { status: 200 });
    }

    return NextResponse.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
