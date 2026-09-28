import { startNegotiation, runNextTurn } from "@/lib/agents/session";
import { logDecision } from "@/lib/agents/reputation";
import { rankListings, applyFilters } from "@/lib/marketplace/match";
import { Agent, ListingWithSeller } from "@/lib/types";
import { SupabaseClient } from "@supabase/supabase-js";

export type RunAgentResult = {
  agent: { id: string; name: string; goal: string | null };
  matches: { id: string; title: string; price: number; score: number }[];
  negotiations_started: string[];
  negotiations_completed: {
    id: string;
    status: string;
    final_price?: number;
    listing?: string;
  }[];
  skipped_reason?: string;
};

/**
 * Autonomous buyer loop:
 * 1. Load agent + remaining budget
 * 2. Rank active listings against policy/goal
 * 3. Open negotiations on top matches
 * 4. Optionally run each negotiation to completion
 */
export async function runBuyerAgent(
  supabase: SupabaseClient,
  agentId: string,
  opts: {
    maxNegotiations?: number;
    autoComplete?: boolean;
    keywords?: string;
  } = {}
): Promise<RunAgentResult> {
  const maxNegotiations = opts.maxNegotiations ?? 2;
  const autoComplete = opts.autoComplete ?? true;

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (agentError || !agent) {
    throw new Error("Agent not found");
  }

  if (agent.status !== "active") {
    return {
      agent: { id: agent.id, name: agent.name, goal: agent.goal },
      matches: [],
      negotiations_started: [],
      negotiations_completed: [],
      skipped_reason: `Agent is ${agent.status}`,
    };
  }

  const remaining = Number(agent.budget) - Number(agent.spent);
  if (remaining <= 0) {
    return {
      agent: { id: agent.id, name: agent.name, goal: agent.goal },
      matches: [],
      negotiations_started: [],
      negotiations_completed: [],
      skipped_reason: "No remaining budget",
    };
  }

  const { data: listings } = await supabase
    .from("listings")
    .select(
      `*, seller:agents!seller_agent_id (id, name, reputation, status)`
    )
    .eq("status", "active")
    .gt("stock", 0);

  let candidates = (listings || []) as ListingWithSeller[];

  // Don't buy from self
  candidates = candidates.filter((l) => l.seller_agent_id !== agentId);

  // Only active sellers
  candidates = candidates.filter(
    (l) => !l.seller || l.seller.reputation === undefined || true
  );
  candidates = candidates.filter(
    (l) => !(l as ListingWithSeller & { seller?: { status?: string } }).seller ||
      (l as ListingWithSeller & { seller?: { status?: string } }).seller?.status !== "blocked"
  );

  const keywords =
    opts.keywords ||
    agent.goal ||
    (agent.policy?.categories || []).join(" ") ||
    "";

  candidates = applyFilters(candidates, {
    keywords,
    maxPrice: agent.policy?.max_price
      ? Math.min(agent.policy.max_price, remaining)
      : remaining,
    category: undefined,
  });

  const ranked = rankListings(candidates, agent as Agent).filter(
    (l) => (l.match_score || 0) > 0 && Number(l.price) <= remaining
  );

  const top = ranked.slice(0, maxNegotiations);

  await logDecision(supabase, {
    agentId,
    actionType: "match",
    payload: {
      keywords,
      match_count: ranked.length,
      selected: top.map((t) => ({ id: t.id, title: t.title, score: t.match_score })),
    },
    source: "rules",
  });

  const started: string[] = [];
  const completed: RunAgentResult["negotiations_completed"] = [];

  for (const listing of top) {
    const start = await startNegotiation(supabase, agentId, listing.id);
    if ("error" in start && start.error) continue;
    if (!start.data) continue;

    const negId = start.data.id as string;
    started.push(negId);

    if (!autoComplete) continue;

    let current = start.data;
    let safety = 0;
    while (
      (current.status === "open" || current.status === "countered") &&
      safety < 14
    ) {
      const turn = await runNextTurn(supabase, negId);
      if ("error" in turn && turn.error) break;
      if (!turn.data) break;
      current = turn.data;
      safety++;
    }

    completed.push({
      id: negId,
      status: current.status,
      final_price: current.current_offer ?? undefined,
      listing: listing.title,
    });
  }

  return {
    agent: { id: agent.id, name: agent.name, goal: agent.goal },
    matches: top.map((t) => ({
      id: t.id,
      title: t.title,
      price: Number(t.price),
      score: t.match_score || 0,
    })),
    negotiations_started: started,
    negotiations_completed: completed,
  };
}

/**
 * Run every active agent that has remaining budget once.
 */
export async function runAllActiveBuyers(
  supabase: SupabaseClient,
  opts: { maxNegotiationsPerAgent?: number; autoComplete?: boolean } = {}
) {
  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, budget, spent, status")
    .eq("status", "active");

  const results: RunAgentResult[] = [];

  for (const agent of agents || []) {
    const remaining = Number(agent.budget) - Number(agent.spent);
    if (remaining <= 0) continue;

    try {
      const result = await runBuyerAgent(supabase, agent.id, {
        maxNegotiations: opts.maxNegotiationsPerAgent ?? 1,
        autoComplete: opts.autoComplete ?? true,
      });
      results.push(result);
    } catch (err) {
      results.push({
        agent: { id: agent.id, name: agent.name, goal: null },
        matches: [],
        negotiations_started: [],
        negotiations_completed: [],
        skipped_reason: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}
