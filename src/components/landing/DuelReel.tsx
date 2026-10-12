"use client";

import { useEffect, useState } from "react";
import { PriceDuel, type DuelData } from "@/components/landing/PriceDuel";
import type { Duel } from "@/lib/landing-stats";

const STEP_MS = 1300;
const HOLD_MS = 3200;

/**
 * Replays recent real deals as price duels: each move draws in, the
 * handshake holds, then the next deal. Reduced motion shows one finished duel.
 */
export function DuelReel({ duels }: { duels: Duel[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const reel: DuelData[] = duels.map((d, i) => ({ key: `reel-${i}`, ...d }));
  const duel = reel.length ? reel[index % reel.length] : null;

  useEffect(() => {
    if (!duel) return;
    const last = duel.messages.length - 1;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setRevealed(last), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => {
        if (revealed < last) setRevealed(revealed + 1);
        else {
          setRevealed(0);
          setIndex((i) => i + 1);
        }
      },
      revealed < last ? STEP_MS : HOLD_MS
    );
    return () => clearTimeout(t);
  }, [duel, revealed]);

  if (!duel) return null;
  return (
    <figure className="card overflow-hidden">
      <div className="min-h-[420px]">
        <PriceDuel duel={duel} revealed={revealed} />
      </div>
    </figure>
  );
}
