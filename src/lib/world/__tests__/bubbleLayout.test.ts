import { describe, it, expect } from "vitest";
import { stackBubbles, type BubbleBox } from "../bubbleLayout";

const box = (key: string, ax: number, ay: number, w = 160, h = 40): BubbleBox => ({
  key,
  ax,
  ay,
  w,
  h,
});

function overlaps(a: { x: number; y: number }, b: { x: number; y: number }, w = 160, h = 40) {
  return a.x < b.x + w && b.x < a.x + w && a.y < b.y + h && b.y < a.y + h;
}

describe("stackBubbles", () => {
  it("leaves a lone bubble centred above its anchor", () => {
    const [p] = stackBubbles([box("a", 400, 300)], { width: 900 });
    expect(p).toEqual({ key: "a", x: 320, y: 260 });
  });

  it("stacks side-by-side speakers instead of overlapping", () => {
    const out = stackBubbles([box("buyer", 400, 300), box("seller", 430, 305)], { width: 900 });
    const by = Object.fromEntries(out.map((p) => [p.key, p]));
    expect(overlaps(by.buyer, by.seller)).toBe(false);
    // The nearer (lower) anchor keeps its spot; the other climbs above it
    expect(by.seller.y).toBe(265);
    expect(by.buyer.y).toBeLessThan(by.seller.y - 40);
  });

  it("resolves a pile-up of many bubbles", () => {
    const items = Array.from({ length: 6 }, (_, i) => box(`b${i}`, 400 + i * 10, 300 + i));
    const out = stackBubbles(items, { width: 900 });
    for (const a of out)
      for (const b of out) if (a !== b) expect(overlaps(a, b), `${a.key}/${b.key}`).toBe(false);
  });

  it("does not move bubbles that are already apart", () => {
    const out = stackBubbles([box("a", 200, 300), box("b", 600, 300)], { width: 900 });
    expect(out.map((p) => p.y)).toEqual([260, 260]);
  });

  it("keeps bubbles inside the viewport horizontally", () => {
    const [left] = stackBubbles([box("l", 10, 300)], { width: 900 });
    const [right] = stackBubbles([box("r", 895, 300)], { width: 900 });
    expect(left.x).toBe(4);
    expect(right.x).toBe(900 - 160 - 4);
  });

  it("is stable regardless of input order", () => {
    const a = [box("x", 400, 300), box("y", 410, 300)];
    expect(stackBubbles(a, { width: 900 })).toEqual(
      expect.arrayContaining(stackBubbles([...a].reverse(), { width: 900 }))
    );
  });
});
