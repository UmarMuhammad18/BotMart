import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AgentPolicy } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const update: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!["active", "paused", "blocked"].includes(body.status)) {
        return NextResponse.json(
          { error: "status must be active, paused, or blocked" },
          { status: 400 }
        );
      }
      update.status = body.status;
    }

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
      }
      update.name = body.name.trim();
    }

    if (body.description !== undefined) {
      update.description = typeof body.description === "string" ? body.description.trim() : null;
    }

    if (body.budget !== undefined) {
      const budget = Number(body.budget);
      if (!Number.isFinite(budget) || budget < 0) {
        return NextResponse.json({ error: "budget must be a non-negative number" }, { status: 400 });
      }
      update.budget = budget;
    }

    if (body.policy !== undefined) {
      const policy = body.policy as AgentPolicy;
      if (
        policy.max_price !== undefined &&
        policy.min_price !== undefined &&
        Number(policy.max_price) < Number(policy.min_price)
      ) {
        return NextResponse.json(
          { error: "policy.max_price cannot be less than policy.min_price" },
          { status: 400 }
        );
      }
      update.policy = policy;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .update(update)
      .eq("id", id)
      .eq("owner_id", user.id)
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Guard against deleting an agent that is mid-negotiation or has an
    // order history — archive (block) it instead so records stay intact.
    const { data: openNegotiations } = await supabase
      .from("negotiations")
      .select("id")
      .in("status", ["open", "countered"])
      .or(`buyer_agent_id.eq.${id},seller_agent_id.eq.${id}`)
      .limit(1);

    if (openNegotiations && openNegotiations.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete an agent with an open negotiation. Resolve it first." },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("agents")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
