import type { NegotiationMessage } from "@/lib/types";

/**
 * Geometry for the hero's "price duel": the seller's line starts at the
 * asking price and steps down, the buyer's line starts at the opening offer
 * and steps up, and on an accepted deal both meet at the deal price.
 * Step i is message i on the x axis; step 0 also carries the asking price.
 */

export type Side = "buyer" | "seller";

export type DuelPoint = {
  side: Side;
  step: number;
  x: number;
  y: number;
  price: number;
};

export type DuelGeometry = {
  buyer: DuelPoint[];
  seller: DuelPoint[];
  deal: { step: number; x: number; y: number; price: number } | null;
  ticks: { y: number; price: number }[];
  lastStep: number;
  /** Map a price to y, for overlays that track the lines. */
  y: (price: number) => number;
};

export type Box = { width: number; height: number; padX: number; padTop: number; padBottom: number };

function niceStep(range: number) {
  const raw = range / 4;
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}

export function duelGeometry(
  messages: NegotiationMessage[],
  askPrice: number,
  box: Box
): DuelGeometry {
  const priced = messages.map((m) => (m.price != null && m.price > 0 ? Number(m.price) : null));
  const prices = [askPrice, ...priced.filter((p): p is number => p != null)].filter((p) => p > 0);
  const hi0 = Math.max(...prices);
  const lo0 = Math.min(...prices);
  const span = Math.max(hi0 - lo0, hi0 * 0.2, 1);
  const hi = hi0 + span * 0.12;
  const lo = Math.max(0, lo0 - span * 0.18);

  const innerW = box.width - box.padX * 2;
  const innerH = box.height - box.padTop - box.padBottom;
  const lastStep = Math.max(messages.length - 1, 1);
  const x = (step: number) => box.padX + (step / lastStep) * innerW;
  const y = (price: number) => box.padTop + ((hi - price) / (hi - lo)) * innerH;
  const point = (side: Side, step: number, price: number): DuelPoint => ({
    side,
    step,
    x: x(step),
    y: y(price),
    price,
  });

  const buyer: DuelPoint[] = [];
  const seller: DuelPoint[] = [point("seller", 0, askPrice)];
  let deal: DuelGeometry["deal"] = null;

  messages.forEach((m, i) => {
    const price = priced[i];
    if (price == null) return; // reject / chat: no move on the chart
    if (m.type === "accept") {
      // Both lines arrive at the agreed price on the same step
      buyer.push(point("buyer", i, price));
      seller.push(point("seller", i, price));
      deal = { step: i, x: x(i), y: y(price), price };
      return;
    }
    if (m.type === "offer" || m.type === "counter") {
      (m.from === "buyer" ? buyer : seller).push(point(m.from, i, price));
    }
  });

  const stepSize = niceStep(hi - lo);
  const ticks: DuelGeometry["ticks"] = [];
  for (let p = Math.ceil(lo / stepSize) * stepSize; p <= hi; p += stepSize) {
    ticks.push({ price: p, y: y(p) });
  }

  return { buyer, seller, deal, ticks, lastStep: messages.length - 1, y };
}

/** Latest point on a side at or before a step. */
export function headAt(points: DuelPoint[], step: number): DuelPoint | null {
  let head: DuelPoint | null = null;
  for (const p of points) if (p.step <= step) head = p;
  return head;
}
