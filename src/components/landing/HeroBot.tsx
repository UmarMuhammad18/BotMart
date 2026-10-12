"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { BotCue } from "@/components/landing/HeroBotScene";

// three.js loads after the headline: the hero copy never waits on WebGL
const HeroBotScene = dynamic(() => import("@/components/landing/HeroBotScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-end justify-center pb-[18%]" aria-hidden>
      <div className="h-24 w-56 rounded-[50%] bg-[radial-gradient(closest-side,rgba(58,143,59,0.22),transparent)]" />
    </div>
  ),
});

/**
 * The hero's agent: BotMart's village robot on a floating patch of meadow.
 * It follows the cursor, waves when you come close, reacts when poked and
 * narrates the live demo through its speech bubble.
 */
export function HeroBot({
  line,
  cue,
  onPoke,
}: {
  line: string | null;
  cue: BotCue | null;
  onPoke: () => void;
}) {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setStill(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-[520px] sm:aspect-square lg:mr-0">
      {/* Daylight behind the island */}
      <div
        className="absolute inset-[6%] rounded-full bg-[radial-gradient(closest-side,#fff6d8_0%,rgba(255,246,216,0.4)_45%,transparent_72%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0"
        role="img"
        aria-label="BotMart's agent, a green robot standing on a floating patch of meadow beside its desk. It follows your cursor and reacts when you click it."
      >
        <HeroBotScene cue={cue} onPoke={onPoke} still={still} />
      </div>

      {line && (
        <div className="pointer-events-none absolute left-[6%] top-[4%] max-w-[64%] sm:left-[4%]" aria-live="polite">
          <div
            key={line}
            className="bot-say relative rounded-2xl border border-ink/10 bg-paper/95 px-4 py-3 text-[15px] leading-snug text-ink shadow-[0_12px_32px_-14px_rgba(20,60,32,0.35)] backdrop-blur"
          >
            {line}
            <span
              className="absolute -bottom-2 right-10 h-4 w-4 rotate-45 border-b border-r border-ink/10 bg-paper/95"
              aria-hidden
            />
          </div>
        </div>
      )}

      {/* Keyboard and screen-reader route to the same interaction */}
      <button
        type="button"
        onClick={onPoke}
        className="sr-only focus:not-sr-only focus:absolute focus:bottom-3 focus:left-1/2 focus:-translate-x-1/2 focus:rounded-lg focus:bg-paper focus:px-4 focus:py-2 focus:text-sm focus:text-ink focus:shadow"
      >
        Say hi to the agent
      </button>
    </div>
  );
}
