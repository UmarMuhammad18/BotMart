import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiting for the public, write-heavy endpoints (demo,
 * seed, negotiations, court…). Counts live in Postgres (hit_rate_limit() in
 * supabase/schema.sql) so every serverless instance shares them; if that
 * function isn't deployed yet we fall back to a per-instance memory counter,
 * which still stops a single client hammering one warm instance.
 */

type Rule = { limit: number; windowSec: number };

const memory = new Map<string, { start: number; count: number }>();
let dbAvailable: boolean | null = null;

/** The caller's IP, hashed: we only need a stable key, not the address. */
export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || request.headers.get("x-real-ip") || "unknown";
  const salt = process.env.RATE_LIMIT_SALT || "botmart";
  return createHash("sha256").update(ip + salt).digest("hex").slice(0, 24);
}

function hitMemory(key: string, windowSec: number) {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.start > windowSec * 1000) {
    memory.set(key, { start: now, count: 1 });
    if (memory.size > 5000) {
      // Drop expired windows so the map can't grow without bound
      for (const [k, v] of memory) if (now - v.start > 3600_000) memory.delete(k);
    }
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

async function hit(key: string, windowSec: number): Promise<number> {
  if (dbAvailable !== false) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.rpc("hit_rate_limit", {
        p_key: key,
        p_window_seconds: windowSec,
      });
      if (!error && typeof data === "number") {
        dbAvailable = true;
        return data;
      }
      if (error && (error.code === "PGRST202" || error.code === "42883" || error.code === "42P01")) {
        dbAvailable = false; // not migrated yet: stop asking
      }
    } catch {
      // Fall through to memory
    }
  }
  return hitMemory(key, windowSec);
}

export type LimitResult = { ok: true } | { ok: false; retryAfter: number; scope: string };

/**
 * Check every rule for `name`. Rules can be per client ("ip") or shared by
 * everyone ("global"), e.g. a daily ceiling on demo runs.
 */
export async function rateLimit(
  request: Request,
  name: string,
  rules: { ip?: Rule[]; global?: Rule[] }
): Promise<LimitResult> {
  const who = clientKey(request);
  const checks: { key: string; rule: Rule; scope: string }[] = [
    ...(rules.ip || []).map((rule) => ({ key: `${name}:ip:${who}:${rule.windowSec}`, rule, scope: "you" })),
    ...(rules.global || []).map((rule) => ({ key: `${name}:global:${rule.windowSec}`, rule, scope: "everyone" })),
  ];
  for (const { key, rule, scope } of checks) {
    const count = await hit(key, rule.windowSec);
    if (count > rule.limit) return { ok: false, retryAfter: rule.windowSec, scope };
  }
  return { ok: true };
}

/** A 429 JSON response with a friendly message and Retry-After. */
export function tooManyRequests(result: Extract<LimitResult, { ok: false }>, what = "requests") {
  const minutes = Math.max(1, Math.round(result.retryAfter / 60));
  const wait = minutes >= 60 ? `${Math.round(minutes / 60)} hour${minutes >= 120 ? "s" : ""}` : `${minutes} minute${minutes > 1 ? "s" : ""}`;
  const message =
    result.scope === "everyone"
      ? `The village has had a lot of ${what} today. Try again in about ${wait}.`
      : `Too many ${what}. Try again in about ${wait}.`;
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
  );
}

/** Shared limits, so each route stays one line. */
export const LIMITS = {
  demo: { ip: [{ limit: 4, windowSec: 60 }, { limit: 25, windowSec: 86_400 }], global: [{ limit: 400, windowSec: 86_400 }] },
  seed: { ip: [{ limit: 3, windowSec: 3600 }] },
  negotiate: { ip: [{ limit: 40, windowSec: 60 }, { limit: 600, windowSec: 86_400 }] },
  court: { ip: [{ limit: 6, windowSec: 60 }, { limit: 60, windowSec: 86_400 }] },
  createAgent: { ip: [{ limit: 6, windowSec: 3600 }] },
  runAgents: { ip: [{ limit: 10, windowSec: 60 }] },
  auction: { ip: [{ limit: 6, windowSec: 60 }] },
} satisfies Record<string, { ip?: Rule[]; global?: Rule[] }>;
