import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { resolveApproval } from "@/lib/agents/session";

/**
 * POST { decision: "approve" | "decline" }: the buyer agent's owner answers
 * a deal that is awaiting approval. Only that signed-in owner may answer.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const decision = body.decision;
    if (decision !== "approve" && decision !== "decline") {
      return NextResponse.json({ error: 'decision must be "approve" or "decline"' }, { status: 400 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to approve your agent's deals" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: neg } = await supabase
      .from("negotiations")
      .select("id, buyer:agents!buyer_agent_id (owner_id)")
      .eq("id", id)
      .single();
    const owner = (neg?.buyer as { owner_id?: string } | null)?.owner_id;
    if (!neg) return NextResponse.json({ error: "Negotiation not found" }, { status: 404 });
    if (owner !== user.id) {
      return NextResponse.json({ error: "Only the buyer agent's owner can answer this" }, { status: 403 });
    }

    const result = await resolveApproval(supabase, id, decision);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
