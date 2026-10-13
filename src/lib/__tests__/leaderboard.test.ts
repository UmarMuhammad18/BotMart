import { describe, it, expect } from "vitest";
import { buildLeaderboard, type DealRow } from "@/lib/leaderboard";

let n = 0;
const deal = (buyer: string, asking: number, price: number, category = "electronics"): DealRow => ({
  id: `o${++n}`,
  final_price: price,
  created_at: "2026-01-01",
  asking,
  title: `Item ${n}`,
  category,
  buyer_id: buyer,
  buyer_name: buyer.toUpperCase(),
  seller_id: "s",
  seller_name: "S",
});

describe("buildLeaderboard", () => {
  const deals = [
    deal("a", 100, 70), // 30% off
    deal("a", 100, 80), // 20%
    deal("b", 100, 95), // 5%
    deal("b", 200, 190, "software"),
    deal("c", 100, 50), // one deal only: not ranked as a negotiator
    deal("d", 0, 10), // no asking price: ignored
  ];
  const board = buildLeaderboard(deals, [
    { id: "a", name: "A", reputation: 80, role: "buyer", trades: 2 },
    { id: "z", name: "Z", reputation: 50, role: "buyer", trades: 0 },
    { id: "b", name: "B", reputation: 61, role: "buyer", trades: 2 },
  ]);

  it("ranks negotiators by average discount, with at least two deals", () => {
    expect(board.negotiators.map((x) => x.id)).toEqual(["a", "b"]);
    expect(board.negotiators[0].avgDiscount).toBeCloseTo(0.25, 5);
    expect(board.negotiators[0].saved).toBe(50);
  });

  it("lists the deepest single discounts", () => {
    expect(board.discounts[0].discount).toBeCloseTo(0.5, 5);
    expect(board.discounts.every((d) => d.asking > 0)).toBe(true);
  });

  it("counts deals per district", () => {
    expect(board.districts[0]).toEqual({ id: "electronics", deals: 4, volume: 295 });
    expect(board.districts[1].id).toBe("software");
  });

  it("ranks trust, skipping agents with no track record", () => {
    expect(board.trusted.map((x) => x.id)).toEqual(["a", "b"]);
  });
});
