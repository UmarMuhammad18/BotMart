import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Update reputation after a negotiation ends.
 * Uses only columns guaranteed on the live DB (reputation).
 * If trades_completed / trades_failed exist, updates them; otherwise skips.
 */
export async function applyNegotiationOutcome(
  supabase: SupabaseClient,
  opts: {
    buyerId: string;
    sellerId: string;
    outcome: "accepted" | "rejected" | "escalated";
  }
) {
  const { buyerId, sellerId, outcome } = opts;
  const delta = outcome === "accepted" ? 3 : -1;

  const { data: agents } = await supabase
    .from("agents")
    .select("id, reputation")
    .in("id", [buyerId, sellerId]);

  if (!agents || agents.length === 0) return;

  for (const agent of agents) {
    const nextRep = Math.max(
      0,
      Math.min(100, Number(agent.reputation ?? 50) + delta)
    );

    // Primary update — always safe
    await supabase
      .from("agents")
      .update({ reputation: nextRep })
      .eq("id", agent.id);

    // Best-effort counters if columns exist (migration applied)
    try {
      if (outcome === "accepted") {
        await supabase.rpc("increment_trades_completed", { agent_id: agent.id });
      }
    } catch {
      // Column or function may not exist yet — ignore
    }
  }
}

export async function logDecision(
  supabase: SupabaseClient,
  opts: {
    agentId: string;
    negotiationId?: string | null;
    role?: string;
    actionType: string;
    payload?: Record<string, unknown>;
    source?: "rules" | "grok";
  }
) {
  try {
    await supabase.from("agent_decisions").insert({
      agent_id: opts.agentId,
      negotiation_id: opts.negotiationId ?? null,
      role: opts.role ?? null,
      action_type: opts.actionType,
      payload: opts.payload ?? {},
      source: opts.source ?? "rules",
    });
  } catch {
    // Non-fatal — observability must never break the main loop
  }
}
