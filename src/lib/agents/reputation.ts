import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Update reputation + trade counters after a negotiation ends.
 * Reputation stays roughly in 0–100.
 *
 * Accepted deal:
 *   - both agents +3 (capped at 100)
 *   - trades_completed += 1
 * Rejected / escalated:
 *   - both agents -1 (floored at 0)
 *   - trades_failed += 1
 */
export async function applyNegotiationOutcome(
  supabase: SupabaseClient,
  opts: {
    buyerId: string;
    sellerId: string;
    outcome: "accepted" | "rejected" | "escalated";
    buyerRep?: number;
    sellerRep?: number;
  }
) {
  const { buyerId, sellerId, outcome } = opts;

  const delta = outcome === "accepted" ? 3 : -1;
  const completedInc = outcome === "accepted" ? 1 : 0;
  const failedInc = outcome === "accepted" ? 0 : 1;

  // Fetch current values if not provided
  const { data: agents } = await supabase
    .from("agents")
    .select("id, reputation, trades_completed, trades_failed")
    .in("id", [buyerId, sellerId]);

  if (!agents || agents.length === 0) return;

  for (const agent of agents) {
    const nextRep = Math.max(
      0,
      Math.min(100, Number(agent.reputation ?? 50) + delta)
    );
    await supabase
      .from("agents")
      .update({
        reputation: nextRep,
        trades_completed: Number(agent.trades_completed ?? 0) + completedInc,
        trades_failed: Number(agent.trades_failed ?? 0) + failedInc,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.id);
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
