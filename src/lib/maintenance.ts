import type { SupabaseClient } from "@supabase/supabase-js";
import { SEED_AGENTS, SEED_LISTINGS } from "@/lib/seed-data";
import { DEMO_OWNER_FILTER } from "@/lib/auth";
import { resolveApproval } from "@/lib/agents/session";

/** Approvals nobody answered in this long are declined, so stale deals do not linger. */
const APPROVAL_TTL_HOURS = 48;

export async function expireApprovals(supabase: SupabaseClient) {
  const cutoff = new Date(Date.now() - APPROVAL_TTL_HOURS * 3_600_000).toISOString();
  const { data } = await supabase
    .from("negotiations")
    .select("id")
    .eq("status", "awaiting_approval")
    .lt("updated_at", cutoff)
    .limit(100);
  let expired = 0;
  for (const n of data || []) {
    const r = await resolveApproval(supabase, n.id as string, "decline");
    if (!("error" in r)) expired += 1;
  }
  return expired;
}

/**
 * Nightly reset of the shared demo village, so the one-click demo can't
 * slowly fill the database:
 *  - closed demo-vs-demo negotiations older than `keepDays` are deleted with
 *    their orders and decision logs (recent ones stay for replays)
 *  - demo negotiations stuck open for a day are closed as escalated
 *  - demo agents get their budgets back; seed listings are restocked
 *  - expired rate-limit windows are dropped
 * User-owned agents and anything they took part in are never touched.
 */
export async function resetDemoWorld(supabase: SupabaseClient, { keepDays = 2 } = {}) {
  const report = { deletedNegotiations: 0, closedStale: 0, agentsReset: 0, listingsRestocked: 0 };
  const cutoff = new Date(Date.now() - keepDays * 86_400_000).toISOString();
  const staleCutoff = new Date(Date.now() - 86_400_000).toISOString();

  const { data: demoAgents } = await supabase.from("agents").select("id, name").or(DEMO_OWNER_FILTER);
  const demoIds = (demoAgents || []).map((a) => a.id as string);
  if (demoIds.length === 0) return report;

  // Old, finished demo-only negotiations
  const { data: old } = await supabase
    .from("negotiations")
    .select("id")
    .in("status", ["accepted", "rejected", "escalated"])
    .in("buyer_agent_id", demoIds)
    .in("seller_agent_id", demoIds)
    .lt("updated_at", cutoff)
    .limit(1000);
  const oldIds = (old || []).map((n) => n.id as string);
  for (let i = 0; i < oldIds.length; i += 200) {
    const batch = oldIds.slice(i, i + 200);
    await supabase.from("orders").delete().in("negotiation_id", batch);
    await supabase.from("agent_decisions").delete().in("negotiation_id", batch);
    await supabase.from("notifications").delete().in("negotiation_id", batch); // table may not exist yet
    const { error } = await supabase.from("negotiations").delete().in("id", batch);
    if (!error) report.deletedNegotiations += batch.length;
  }

  // Demo negotiations nobody finished
  const { data: stale } = await supabase
    .from("negotiations")
    .update({ status: "escalated", updated_at: new Date().toISOString() })
    .in("status", ["open", "countered"])
    .in("buyer_agent_id", demoIds)
    .lt("updated_at", staleCutoff)
    .select("id");
  report.closedStale = stale?.length || 0;

  // Budgets back to full, seed stock back on the shelves
  const seedBudgets = new Map(SEED_AGENTS.map((a) => [a.name, a.budget]));
  for (const agent of demoAgents || []) {
    const updates: Record<string, unknown> = { spent: 0 };
    const budget = seedBudgets.get(agent.name as string);
    if (budget !== undefined) updates.budget = budget;
    const { error } = await supabase.from("agents").update(updates).eq("id", agent.id);
    if (!error) report.agentsReset += 1;
  }
  const sellerIdByName = new Map((demoAgents || []).map((a) => [a.name as string, a.id as string]));
  for (const listing of SEED_LISTINGS) {
    const sellerId = sellerIdByName.get(listing.seller);
    if (!sellerId) continue;
    const { data } = await supabase
      .from("listings")
      .update({ stock: listing.stock, status: "active", price: listing.price })
      .eq("title", listing.title)
      .eq("seller_agent_id", sellerId)
      .select("id");
    report.listingsRestocked += data?.length || 0;
  }

  // Old demo decision logs (the replay only needs the last couple of days)
  await supabase.from("agent_decisions").delete().in("agent_id", demoIds).lt("created_at", cutoff);
  await supabase.from("rate_limits").delete().lt("window_start", staleCutoff);

  return report;
}
