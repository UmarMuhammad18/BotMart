import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertCanControlAgent } from "@/lib/auth";
import { asNotes } from "@/lib/agents/memory";
import { personalityFor } from "@/lib/agents/personality";

/** Public profile: personality, trust, memories and recent deals. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // The id goes into a PostgREST filter below: only accept a real UUID
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    const supabase = createAdminClient();
    const { data: agent, error } = await supabase
      .from("agents")
      .select("id, name, description, goal, budget, spent, policy, reputation, status, memory, trades_completed, created_at")
      .eq("id", id)
      .single();
    if (error || !agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const { data: deals } = await supabase
      .from("negotiations")
      .select("id, status, current_offer, updated_at, buyer_agent_id, listing:listings (title)")
      .or(`buyer_agent_id.eq.${id},seller_agent_id.eq.${id}`)
      .in("status", ["accepted", "rejected", "escalated", "awaiting_approval"])
      .order("updated_at", { ascending: false })
      .limit(6);

    const persona = personalityFor((agent.policy as { style?: string } | null)?.style);
    return NextResponse.json({
      ...agent,
      memory: asNotes(agent.memory).slice(0, 8),
      personality: { id: persona.id, label: persona.label, blurb: persona.blurb },
      recent: (deals || []).map((d) => ({
        id: d.id,
        status: d.status,
        price: d.current_offer,
        at: d.updated_at,
        side: d.buyer_agent_id === id ? "bought" : "sold",
        title: (d.listing as { title?: string } | null)?.title ?? "an item",
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const access = await assertCanControlAgent(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const status = body.status as string | undefined;
    const goal = body.goal as string | undefined;
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      if (!["active", "paused", "blocked"].includes(status)) {
        return NextResponse.json(
          { error: "status must be active, paused, or blocked" },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (goal !== undefined) {
      updates.goal = goal;
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
