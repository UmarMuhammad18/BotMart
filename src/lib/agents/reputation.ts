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

/**
 * How a court verdict moves the parties' reputations. The jury rules on
 * whether the deal on the table is fair:
 *  - accept: a fair deal; both parties gain a little
 *  - reject / counter: someone is being unreasonable. If the offer sits well
 *    under what the court thinks is fair, the buyer was lowballing; if it was
 *    near or over it, the seller was holding out.
 */
export function courtReputation(opts: {
  verdict: "accept" | "reject" | "counter";
  offer: number | null;
  listingPrice: number;
  recommended: number | null;
}): { buyer: number; seller: number } {
  if (opts.verdict === "accept") return { buyer: 1, seller: 2 };
  const fair = opts.recommended ?? opts.listingPrice * 0.9;
  const offer = opts.offer ?? opts.listingPrice;
  const penalty = opts.verdict === "reject" ? 3 : 1;
  return offer < fair * 0.9 ? { buyer: -penalty, seller: 0 } : { buyer: 0, seller: -penalty };
}

/** Add deltas to agents' reputations (clamped 0..100). */
export async function adjustReputation(supabase: SupabaseClient, deltas: { id: string; delta: number }[]) {
  const ids = deltas.filter((d) => d.delta !== 0).map((d) => d.id);
  if (ids.length === 0) return;
  const { data } = await supabase.from("agents").select("id, reputation").in("id", ids);
  for (const agent of data || []) {
    const delta = deltas.find((d) => d.id === agent.id)?.delta ?? 0;
    const next = Math.max(0, Math.min(100, Number(agent.reputation ?? 50) + delta));
    await supabase.from("agents").update({ reputation: next }).eq("id", agent.id);
  }
}
