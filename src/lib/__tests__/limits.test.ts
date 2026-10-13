import { describe, it, expect, vi } from "vitest";

// No database in tests: the admin client throws, so both modules fall back to memory
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("no db in tests");
  },
}));

import { clientKey, rateLimit } from "@/lib/rate-limit";
import { withinBudget } from "@/lib/llm-budget";

const req = (ip: string) => new Request("http://x/api/demo", { headers: { "x-forwarded-for": ip } });

describe("rateLimit", () => {
  it("allows up to the limit per client, then refuses", async () => {
    const rules = { ip: [{ limit: 2, windowSec: 60 }] };
    expect((await rateLimit(req("1.1.1.1"), "t1", rules)).ok).toBe(true);
    expect((await rateLimit(req("1.1.1.1"), "t1", rules)).ok).toBe(true);
    const third = await rateLimit(req("1.1.1.1"), "t1", rules);
    expect(third.ok).toBe(false);
    // A different client has its own allowance
    expect((await rateLimit(req("2.2.2.2"), "t1", rules)).ok).toBe(true);
  });

  it("global rules are shared by everyone", async () => {
    const rules = { global: [{ limit: 1, windowSec: 60 }] };
    expect((await rateLimit(req("3.3.3.3"), "t2", rules)).ok).toBe(true);
    const other = await rateLimit(req("4.4.4.4"), "t2", rules);
    expect(other.ok).toBe(false);
    if (!other.ok) expect(other.scope).toBe("everyone");
  });

  it("hashes the IP rather than storing it", () => {
    const k = clientKey(req("10.0.0.1"));
    expect(k).not.toContain("10.0.0.1");
    expect(k).toHaveLength(24);
  });
});

describe("withinBudget", () => {
  it("stops at either the token or the call ceiling", () => {
    const budget = { tokens: 1000, calls: 10 };
    expect(withinBudget({ tokens: 999, calls: 9 }, budget)).toBe(true);
    expect(withinBudget({ tokens: 1000, calls: 1 }, budget)).toBe(false);
    expect(withinBudget({ tokens: 1, calls: 10 }, budget)).toBe(false);
  });
});
