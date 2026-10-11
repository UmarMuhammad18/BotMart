import { describe, it, expect } from "vitest";
import { sanitizeMove } from "../brain";
import { AgentContext, decideNextAction } from "../negotiate";
import type { NegotiationMessage } from "@/lib/types";

const ts = new Date().toISOString();

function msg(
  from: "buyer" | "seller",
  type: NegotiationMessage["type"],
  price?: number
): NegotiationMessage {
  return { from, type, price, message: "", timestamp: ts };
}

function ctx(partial: Partial<AgentContext>): AgentContext {
  return {
    name: "Bot",
    budget: 500,
    spent: 0,
    policy: {},
    role: "buyer",
    listingTitle: "Headphones",
    listingPrice: 100,
    currentOffer: null,
    messages: [],
    ...partial,
  };
}

describe("sanitizeMove", () => {
  it("settles an accept at the counterparty's last price, not the accepter's", () => {
    const move = sanitizeMove(
      ctx({ role: "buyer", messages: [msg("buyer", "offer", 70), msg("seller", "counter", 90)] }),
      { type: "accept", price: 60, message: "deal" }
    );
    expect(move?.type).toBe("accept");
    expect(move?.price).toBe(90);
  });

  it("rejects an accept when nothing has been offered", () => {
    expect(
      sanitizeMove(ctx({ role: "seller" }), { type: "accept", price: 100, message: "ok" })
    ).toBeNull();
  });

  it("rejects a buyer accept above remaining budget", () => {
    expect(
      sanitizeMove(
        ctx({ budget: 100, spent: 50, messages: [msg("buyer", "offer", 40), msg("seller", "counter", 80)] }),
        { type: "accept", message: "deal" }
      )
    ).toBeNull();
  });

  it("rejects a seller accept below min_price", () => {
    expect(
      sanitizeMove(
        ctx({ role: "seller", policy: { min_price: 80 }, messages: [msg("buyer", "offer", 70)] }),
        { type: "accept", message: "deal" }
      )
    ).toBeNull();
  });

  it("clamps buyer offers to budget", () => {
    const move = sanitizeMove(ctx({ budget: 60 }), { type: "offer", price: 95, message: "hi" });
    expect(move?.price).toBe(60);
  });

  it("rejects non-positive prices", () => {
    expect(sanitizeMove(ctx({}), { type: "offer", price: -5, message: "hi" })).toBeNull();
  });
});

describe("decideNextAction (seller)", () => {
  it("never counters above its own previous counter", () => {
    const move = decideNextAction(
      ctx({
        role: "seller",
        messages: [msg("buyer", "offer", 80), msg("seller", "counter", 85), msg("buyer", "counter", 50)],
      })
    );
    expect(move.type).toBe("counter");
    expect(move.price).toBeLessThanOrEqual(85);
  });

  it("accepts when the buyer meets its last counter", () => {
    const move = decideNextAction(
      ctx({
        role: "seller",
        messages: [msg("buyer", "offer", 70), msg("seller", "counter", 85), msg("buyer", "counter", 85)],
      })
    );
    expect(move.type).toBe("accept");
    expect(move.price).toBe(85);
  });
});
