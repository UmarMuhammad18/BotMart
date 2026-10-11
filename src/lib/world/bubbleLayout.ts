/**
 * Screen-space layout for speech bubbles. Each bubble wants to sit centred
 * above its speaker's anchor point; when two would overlap (buyer and seller
 * side by side, neighbouring stalls), later ones are pushed up above the
 * ones already placed. Pure function — tested in __tests__/bubbleLayout.test.ts.
 */

export type BubbleBox = {
  key: string;
  /** Anchor in screen px (bubble's bottom-centre wants to sit here). */
  ax: number;
  ay: number;
  w: number;
  h: number;
};

export type PlacedBubble = { key: string; x: number; y: number };

const MARGIN = 4;

export function stackBubbles(
  items: BubbleBox[],
  opts: { gap?: number; width: number }
): PlacedBubble[] {
  const gap = opts.gap ?? 6;
  // Lowest anchors (nearest the viewer) keep their spot; key keeps it stable
  const order = [...items].sort((a, b) => b.ay - a.ay || a.key.localeCompare(b.key));
  const placed: (PlacedBubble & { w: number; h: number })[] = [];

  for (const b of order) {
    const x = Math.min(
      Math.max(MARGIN, b.ax - b.w / 2),
      Math.max(MARGIN, opts.width - b.w - MARGIN)
    );
    let y = b.ay - b.h;

    // Climb above anything we collide with until clear
    for (let guard = 0; guard <= placed.length; guard++) {
      const hit = placed.find(
        (p) =>
          x < p.x + p.w + gap &&
          p.x < x + b.w + gap &&
          y < p.y + p.h + gap &&
          p.y < y + b.h + gap
      );
      if (!hit) break;
      y = hit.y - b.h - gap;
    }

    placed.push({ key: b.key, x, y, w: b.w, h: b.h });
  }

  return placed.map(({ key, x, y }) => ({ key, x, y }));
}
