import { describe, it, expect } from "vitest";
import { duelGeometry, headAt } from "../duel";
import type { NegotiationMessage } from "@/lib/types";

const box = { width: 600, height: 400, padX: 40, padTop: 30, padBottom: 40 };
const m = (
  from: "buyer" | "seller",
  type: NegotiationMessage["type"],
  price?: number
): NegotiationMessage => ({ from, type, price, message: "", timestamp: "" });

describe("duelGeometry", () => {
  const deal = [m("buyer", "offer", 40), m("seller", "counter", 45), m("buyer", "accept", 45)];

  it("starts the seller at the asking price and the buyer at the opening offer", () => {
    const g = duelGeometry(deal, 50, box);
    expect(g.seller[0]).toMatchObject({ step: 0, price: 50 });
    expect(g.buyer[0]).toMatchObject({ step: 0, price: 40 });
    // Seller is drawn above the buyer (higher price → smaller y)
    expect(g.seller[0].y).toBeLessThan(g.buyer[0].y);
  });

  it("brings both lines to the deal price on the accepting step", () => {
    const g = duelGeometry(deal, 50, box);
    expect(g.deal).toMatchObject({ step: 2, price: 45 });
    expect(g.buyer.at(-1)).toMatchObject({ step: 2, price: 45 });
    expect(g.seller.at(-1)).toMatchObject({ step: 2, price: 45 });
    expect(g.buyer.at(-1)!.x).toBe(box.width - box.padX);
  });

  it("leaves the gap open when the buyer walks away", () => {
    const g = duelGeometry([m("buyer", "offer", 10), m("seller", "counter", 81), m("buyer", "reject")], 89, box);
    expect(g.deal).toBeNull();
    expect(g.buyer).toHaveLength(1);
    expect(g.seller.map((p) => p.price)).toEqual([89, 81]);
  });

  it("keeps every point inside the chart area", () => {
    const g = duelGeometry(deal, 50, box);
    for (const p of [...g.buyer, ...g.seller]) {
      expect(p.x).toBeGreaterThanOrEqual(box.padX);
      expect(p.x).toBeLessThanOrEqual(box.width - box.padX);
      expect(p.y).toBeGreaterThanOrEqual(box.padTop);
      expect(p.y).toBeLessThanOrEqual(box.height - box.padBottom);
    }
  });

  it("produces round price ticks inside the range", () => {
    const g = duelGeometry(deal, 50, box);
    expect(g.ticks.length).toBeGreaterThanOrEqual(3);
    for (const t of g.ticks) expect(t.price % 1).toBe(0);
  });

  it("reports each side's latest move at a step", () => {
    const g = duelGeometry(deal, 50, box);
    expect(headAt(g.seller, 0)?.price).toBe(50);
    expect(headAt(g.seller, 1)?.price).toBe(45);
    expect(headAt(g.buyer, 1)?.price).toBe(40);
  });
});
