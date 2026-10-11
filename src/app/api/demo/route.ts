import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startNegotiation } from "@/lib/agents/session";
import { seedDemo } from "@/lib/seed";
import { resolveRole } from "@/lib/agents/roles";
import type { AgentPolicy } from "@/lib/types";

type Buyer = {
  id: string;
  name: string;
  budget: number;
  spent: number;
  created_at: string;
  policy: AgentPolicy | null;
};

/** Roles that shop. Treasurers, auditors, jurors and judges never buy. */
const BUYING_ROLES = new Set(["buyer", "negotiator", "scout"]);

type Listing = { id: string; title: string; price: number; seller_agent_id: string; stock: number };

const remaining = (a: Buyer) => Number(a.budget) - Number(a.spent);

/**
 * One-click demo: start a negotiation that can actually close.
 * Canonical pairing is BargainBot buying the Premium Wireless Headphones,
 * but budgets and stock change as people use the demo, so fall back to
 * another in-stock listing and to the buyer with the most budget left.
 */
export async function POST() {
  try {
    const supabase = createAdminClient();

    // Always ensure seed data exists (idempotent; seed.ts checks before inserting)
    await seedDemo(supabase);

    const [{ data: agents }, { data: listingRows }] = await Promise.all([
      supabase
        .from("agents")
        .select("id, name, budget, spent, created_at, policy")
        .eq("status", "active"),
      supabase
        .from("listings")
        .select("id, title, price, seller_agent_id, stock")
        .eq("status", "active")
        .gt("stock", 0),
    ]);

    const buyers = ((agents || []) as Buyer[]).filter((a) =>
      BUYING_ROLES.has(resolveRole(a.policy))
    );
    const listings = (listingRows || []) as Listing[];

    // Prefer the headphones, then other mid-priced listings
    const ordered = [
      ...listings.filter((l) => l.title === "Premium Wireless Headphones"),
      ...listings
        .filter((l) => l.title !== "Premium Wireless Headphones")
        .sort((a, b) => Math.abs(Number(a.price) - 80) - Math.abs(Number(b.price) - 80)),
    ];

    for (const listing of ordered) {
      const price = Number(listing.price);
      const affordable = buyers.filter(
        (b) => b.id !== listing.seller_agent_id && remaining(b) >= price
      );
      if (affordable.length === 0) continue;

      const buyer =
        affordable.find((b) => b.name === "BargainBot") ??
        affordable.sort((a, b) => remaining(b) - remaining(a))[0];

      const result = await startNegotiation(supabase, buyer.id, listing.id);
      if ("error" in result && result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json(result.data, { status: 201 });
    }

    return NextResponse.json(
      { error: "No buyer can afford anything on the floor right now. Top up an agent's budget on the dashboard." },
      { status: 409 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
