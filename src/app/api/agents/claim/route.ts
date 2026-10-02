import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/agents/claim
 * Body: { agent_id?: string }  — claim one unowned agent
 * Body: { all: true }          — claim all unowned / demo agents for the current user
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to claim agents" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const supabase = createAdminClient();

    if (body.all === true) {
      const { data, error } = await supabase
        .from("agents")
        .update({
          owner_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .or("owner_id.is.null,owner_id.eq.hackathon-user")
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        claimed: data?.length ?? 0,
        agents: data,
      });
    }

    if (!body.agent_id) {
      return NextResponse.json(
        { error: "agent_id or all: true is required" },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from("agents")
      .select("id, owner_id, name")
      .eq("id", body.agent_id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (
      existing.owner_id &&
      existing.owner_id !== "hackathon-user" &&
      existing.owner_id !== user.id
    ) {
      return NextResponse.json(
        { error: "This agent already has an owner" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("agents")
      .update({
        owner_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.agent_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ claimed: 1, agent: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
