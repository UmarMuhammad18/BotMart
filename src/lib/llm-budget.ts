import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A daily ceiling on LLM spend. Every call's token count is added to
 * llm_usage (bump_llm_usage() in supabase/schema.sql); once today's total
 * passes the budget, grokJson() stops calling providers and agents fall back
 * to the rule engine until midnight UTC. One viral day can't run up a bill.
 *
 *   LLM_DAILY_TOKEN_BUDGET  default 300000
 *   LLM_DAILY_CALL_BUDGET   default 2000
 */

const TOKEN_BUDGET = () => Number(process.env.LLM_DAILY_TOKEN_BUDGET || 300_000);
const CALL_BUDGET = () => Number(process.env.LLM_DAILY_CALL_BUDGET || 2_000);

type Usage = { day: string; calls: number; tokens: number; checkedAt: number };

const today = () => new Date().toISOString().slice(0, 10);
let cache: Usage = { day: today(), calls: 0, tokens: 0, checkedAt: 0 };
let dbAvailable: boolean | null = null;

function rollDay() {
  if (cache.day !== today()) cache = { day: today(), calls: 0, tokens: 0, checkedAt: 0 };
}

/** Pure check, exported for tests. */
export function withinBudget(usage: { calls: number; tokens: number }, budget = { tokens: TOKEN_BUDGET(), calls: CALL_BUDGET() }) {
  return usage.tokens < budget.tokens && usage.calls < budget.calls;
}

async function refresh() {
  if (dbAvailable === false || Date.now() - cache.checkedAt < 30_000) return;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("llm_usage").select("calls, tokens").eq("day", cache.day).maybeSingle();
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") dbAvailable = false;
      return;
    }
    dbAvailable = true;
    // Other instances may have spent too: take the larger of ours and the shared total
    cache.calls = Math.max(cache.calls, Number(data?.calls || 0));
    cache.tokens = Math.max(cache.tokens, Number(data?.tokens || 0));
    cache.checkedAt = Date.now();
  } catch {
    // Keep the in-memory view
  }
}

/** True if another LLM call fits in today's budget. */
export async function llmBudgetAllows(): Promise<boolean> {
  rollDay();
  await refresh();
  return withinBudget(cache);
}

/** Record one call and its tokens (from the provider's usage field, or an estimate). */
export async function recordLlmUsage(tokens: number) {
  rollDay();
  cache.calls += 1;
  cache.tokens += Math.max(0, Math.round(tokens));
  if (dbAvailable === false) return;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("bump_llm_usage", { p_tokens: Math.round(tokens) });
    if (error) {
      if (error.code === "PGRST202" || error.code === "42883") dbAvailable = false;
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      cache.calls = Math.max(cache.calls, Number(row.calls || 0));
      cache.tokens = Math.max(cache.tokens, Number(row.tokens || 0));
      cache.checkedAt = Date.now();
    }
  } catch {
    // Non-fatal
  }
}

/** Today's usage against the budget, for the dashboard. */
export async function llmUsageToday() {
  rollDay();
  await refresh();
  return { day: cache.day, calls: cache.calls, tokens: cache.tokens, tokenBudget: TOKEN_BUDGET(), callBudget: CALL_BUDGET() };
}
