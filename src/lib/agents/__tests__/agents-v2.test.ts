import { describe, it, expect, vi } from "vitest";

// session.ts pulls in Stripe / Supabase helpers; the pure bits tested here don't need them
vi.mock("@/lib/stripe", () => ({ createTestPaymentIntent: async () => null }));

import { decideNextAction, type AgentContext } from "../negotiate";
import { personalityFor } from "../personality";
import { notesFromNegotiation, relationshipWith } from "../memory";
import { parseNewAgent } from "../newAgent";
import { courtReputation } from "../reputation";
import { needsApproval } from "../session";

const ctx = (over: Partial<AgentContext> = {}): AgentContext => ({
  name: "B",
  budget: 1000,
  spent: 0,
  role: "buyer",
  listingTitle: "Lamp",
  listingPrice: 100,
  currentOffer: null,
  messages: [],
  ...over,
});

const msg = (from: "buyer" | "seller", type: "offer" | "counter" | "accept" | "reject", price?: number) => ({
  from,
  type,
  price,
  message: "",
  timestamp: "",
});

describe("personalities", () => {
  it("unknown styles behave like the original engine (balanced)", () => {
    expect(personalityFor("whatever").id).toBe("balanced");
    expect(decideNextAction(ctx()).price).toBe(80);
  });
  it("change how low a buyer opens", () => {
    expect(decideNextAction(ctx({ policy: { style: "thrifty" } })).price).toBe(68);
    expect(decideNextAction(ctx({ policy: { style: "impatient" } })).price).toBe(90);
  });
  it("hard-nosed sellers hold out for more than friendly ones", () => {
    const offer = [msg("buyer", "offer", 80)];
    const firm = decideNextAction(ctx({ role: "seller", messages: offer, policy: { style: "firm" } }));
    const friendly = decideNextAction(ctx({ role: "seller", messages: offer, policy: { style: "friendly" } }));
    expect(firm.type).toBe("counter");
    expect(friendly.type).toBe("counter");
    expect(firm.price!).toBeGreaterThan(friendly.price!);
  });
});

describe("memory", () => {
  const buyer = { id: "b", name: "Bargain" };
  const seller = { id: "s", name: "Gadget" };

  it("a seller remembers being lowballed, and holds it against the buyer", () => {
    const notes = notesFromNegotiation({
      negotiationId: "n1",
      buyer,
      seller,
      listingTitle: "Lamp",
      listingPrice: 100,
      messages: [msg("buyer", "offer", 40), msg("seller", "reject")],
      outcome: "rejected",
    });
    expect(notes.seller.outcome).toBe("lowballed");
    expect(notes.seller.text).toMatch(/lowballed me at £40/);
    const rel = relationshipWith([notes.seller, notes.seller, notes.seller], "b");
    expect(rel.grudge).toBe(1);
    expect(rel.notes[0]).toMatch(/lowballed/);
  });

  it("a grudge makes the seller tougher on the same offer", () => {
    const offer = [msg("buyer", "offer", 85)];
    const fresh = decideNextAction(ctx({ role: "seller", messages: offer }));
    const sore = decideNextAction(ctx({ role: "seller", messages: offer, relationship: { grudge: 1, loyalty: 0, notes: [] } }));
    expect(fresh.type).toBe("counter");
    expect(sore.price!).toBeGreaterThan(fresh.price!);
  });

  it("deals together build loyalty and cancel grudges", () => {
    const deal = notesFromNegotiation({
      negotiationId: "n2",
      buyer,
      seller,
      listingTitle: "Lamp",
      listingPrice: 100,
      messages: [],
      outcome: "accepted",
      price: 90,
    });
    expect(deal.buyer.text).toBe("Bought Lamp from Gadget for £90.");
    const rel = relationshipWith([deal.seller, deal.seller, deal.seller], "b");
    expect(rel.loyalty).toBe(1);
    expect(rel.grudge).toBe(0);
  });

  it("ignores junk in the memory column", () => {
    expect(relationshipWith("nope", "b")).toEqual({ grudge: 0, loyalty: 0, notes: [] });
    expect(relationshipWith([null, 3, { text: 1 }], "b").notes).toEqual([]);
  });
});

describe("parseNewAgent", () => {
  it("accepts the onboarding payload", () => {
    const r = parseNewAgent({
      name: "  Penny  Finch ",
      budget: 300,
      policy: { role: "buyer", style: "thrifty", categories: ["Electronics", "<b>"], max_price: 90, require_approval: true },
    });
    if ("error" in r) throw new Error(r.error);
    expect(r.name).toBe("Penny Finch");
    expect(r.policy).toMatchObject({ role: "buyer", style: "thrifty", categories: ["electronics"], max_price: 90, require_approval: true });
  });
  it("rejects bad names, budgets and prices", () => {
    expect(parseNewAgent({ name: "x" })).toHaveProperty("error");
    expect(parseNewAgent({ name: "<script>" })).toHaveProperty("error");
    expect(parseNewAgent({ name: "Ok", budget: 5 })).toHaveProperty("error");
    expect(parseNewAgent({ name: "Ok", budget: 100, policy: { max_price: 500 } })).toHaveProperty("error");
    expect(parseNewAgent({ name: "Ok", first_listing: { title: "Desk", price: 0 } })).toHaveProperty("error");
  });
  it("cleans a seller's first listing", () => {
    const r = parseNewAgent({
      name: "Stall",
      policy: { role: "seller", min_price: 500 },
      first_listing: { title: "Desk lamp", price: 60, category: "??", stock: 99 },
    });
    if ("error" in r) throw new Error(r.error);
    expect(r.firstListing).toMatchObject({ title: "Desk lamp", price: 60, category: "general", stock: 20 });
    expect(r.policy.min_price).toBe(60);
  });
});

describe("courtReputation", () => {
  it("rewards a fair deal and blames the unreasonable side otherwise", () => {
    expect(courtReputation({ verdict: "accept", offer: 90, listingPrice: 100, recommended: 90 })).toEqual({ buyer: 1, seller: 2 });
    expect(courtReputation({ verdict: "reject", offer: 40, listingPrice: 100, recommended: 85 })).toEqual({ buyer: -3, seller: 0 });
    expect(courtReputation({ verdict: "reject", offer: 95, listingPrice: 100, recommended: 85 })).toEqual({ buyer: 0, seller: -3 });
    expect(courtReputation({ verdict: "counter", offer: 60, listingPrice: 100, recommended: null })).toEqual({ buyer: -1, seller: 0 });
  });
});

describe("needsApproval", () => {
  it("only asks real owners who turned it on", () => {
    expect(needsApproval({ policy: { require_approval: true }, owner_id: "u1" })).toBe(true);
    expect(needsApproval({ policy: { require_approval: true }, owner_id: "hackathon-user" })).toBe(false);
    expect(needsApproval({ policy: {}, owner_id: "u1" })).toBe(false);
  });
});
