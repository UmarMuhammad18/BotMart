"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Boxes, Loader2, Play, RotateCcw } from "lucide-react";
import { PriceDuel, type DuelData } from "@/components/landing/PriceDuel";
import type { Duel } from "@/lib/landing-stats";
import type { NegotiationMessage } from "@/lib/types";

type DemoNegotiation = {
  id: string;
  status: string;
  current_offer: number | null;
  messages: NegotiationMessage[];
  buyer?: { name: string } | null;
  seller?: { name: string } | null;
  listing?: { title: string; price: number } | null;
};

type Phase = "reel" | "starting" | "live" | "done" | "error";

const OPEN = ["open", "countered"];
const TURN_LIMIT = 14;
const STEP_MS = 1300;
const HOLD_MS = 3200;
const HEADLINE = ["Agents", "that", "haggle."];

/** Window event the closing CTA uses to start the demo up here. */
export const HERO_DEMO_EVENT = "botmart:hero-demo";

const toDuel = (d: Duel, i: number): DuelData => ({ key: `reel-${i}`, ...d });

/**
 * The landing hero. The stage is a "price duel": the seller's asking price
 * falls, the buyer's offer rises, and they meet at the deal. Idle, it replays
 * recent real deals; "One-click demo" draws a live negotiation as it happens.
 */
export function Hero({ duels }: { duels: Duel[] }) {
  const [phase, setPhase] = useState<Phase>("reel");
  const [reelIndex, setReelIndex] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [liveDuel, setLiveDuel] = useState<DuelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);
  const stageRef = useRef<HTMLElement>(null);

  const reel = duels.map(toDuel);
  const reelDuel = reel.length ? reel[reelIndex % reel.length] : null;

  // Idle reel: draw each move, hold on the handshake, move to the next deal
  useEffect(() => {
    if (phase !== "reel" || !reelDuel) return;
    const last = reelDuel.messages.length - 1;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setRevealed(last), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => {
        if (revealed < last) setRevealed(revealed + 1);
        else {
          setRevealed(0);
          setReelIndex((i) => i + 1);
        }
      },
      revealed < last ? STEP_MS : HOLD_MS
    );
    return () => clearTimeout(t);
  }, [phase, reelDuel, revealed]);

  const runDemo = useCallback(async () => {
    const id = ++runId.current;
    const alive = () => runId.current === id;
    setPhase("starting");
    setError(null);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.innerWidth < 1024) {
      stageRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }

    const show = (n: DemoNegotiation) => {
      setLiveDuel({
        key: `live-${n.id}`,
        listingTitle: n.listing?.title ?? "Listing",
        askPrice: Number(n.listing?.price ?? n.messages[0]?.price ?? 0),
        buyerName: n.buyer?.name ?? "Buyer",
        sellerName: n.seller?.name ?? "Seller",
        messages: n.messages,
      });
      setRevealed(Math.max(0, n.messages.length - 1));
    };

    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const data = await res.json();
      if (!alive()) return;
      if (!res.ok) throw new Error(data.error || "The demo couldn't start. Try again in a moment.");
      let current = data as DemoNegotiation;
      show(current);
      setPhase("live");

      for (let turn = 0; turn < TURN_LIMIT && OPEN.includes(current.status); turn++) {
        await new Promise((r) => setTimeout(r, 900));
        const next = await fetch("/api/negotiations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "next_turn", negotiation_id: current.id }),
        });
        const nextData = await next.json();
        if (!alive()) return;
        if (!next.ok) break; // e.g. stock went to another buyer; keep what we have
        current = { ...current, ...(nextData as DemoNegotiation) };
        show(current);
      }
      setPhase("done");
      // Lets "Open the full negotiation" show this exact transcript
      sessionStorage.setItem("botmart-demo-neg", JSON.stringify(current));
    } catch (err) {
      if (!alive()) return;
      setError(err instanceof Error ? err.message : "Network error. Check your connection and try again.");
      setPhase("error");
    }
  }, []);

  // The closing CTA further down the page starts the demo here
  useEffect(() => {
    const onDemo = () => void runDemo();
    window.addEventListener(HERO_DEMO_EVENT, onDemo);
    return () => window.removeEventListener(HERO_DEMO_EVENT, onDemo);
  }, [runDemo]);

  const busy = phase === "starting" || phase === "live";
  const showLive = phase !== "reel" && liveDuel != null;
  const duel = showLive ? liveDuel : reelDuel;

  return (
    <section id="hero" className="relative overflow-hidden border-b border-white/[0.06]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(55%_65%_at_75%_45%,rgba(31,191,108,0.16),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40%_50%_at_10%_90%,rgba(195,236,124,0.06),transparent_70%)]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-20 grid gap-12 lg:grid-cols-12 lg:gap-10 lg:items-center">
        <div className="min-w-0 lg:col-span-6 text-center lg:text-left">
          <h1 className="text-[3.25rem] sm:text-7xl lg:text-[5.25rem] font-semibold tracking-[-0.05em] leading-[0.92] text-white">
            {HEADLINE.map((word, i) => (
              <span
                key={word}
                className={`hero-word inline-block ${i === HEADLINE.length - 1 ? "text-emerald-400" : ""}`}
                style={{ animationDelay: `${120 + i * 110}ms` }}
              >
                {word}
                {i < HEADLINE.length - 1 && " "}
              </span>
            ))}
          </h1>
          <p className="hero-rise mt-6 text-base sm:text-lg leading-relaxed text-zinc-400 max-w-[40ch] mx-auto lg:mx-0" style={{ animationDelay: "480ms" }}>
            Give an agent a budget and a goal. It finds a listing, talks the
            price down and closes the deal.
          </p>

          <div className="hero-rise mt-9 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start" style={{ animationDelay: "600ms" }}>
            <button
              type="button"
              onClick={() => void runDemo()}
              disabled={busy}
              aria-busy={busy}
              aria-controls="hero-stage"
              className="btn-primary text-base px-7 py-3.5 rounded-xl justify-center whitespace-nowrap"
              id="btn-one-click-demo"
            >
              {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Play size={18} className="fill-current" aria-hidden />}
              {busy ? "Agents are haggling…" : "One-click demo"}
            </button>
            <Link
              href="/world"
              className="btn-secondary text-base px-7 py-3.5 rounded-xl justify-center whitespace-nowrap"
              id="btn-enter-world"
            >
              <Boxes size={18} aria-hidden />
              Enter the 3D world
            </Link>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-6 hero-stage-in" style={{ animationDelay: "250ms" }}>
          <figure ref={stageRef} className="mx-auto w-full max-w-[600px] lg:mr-0">
            <Spotlight>
              <div id="hero-stage" className="relative min-h-[420px] rounded-[21px] bg-surface-1 sm:min-h-[480px]">
                {phase === "starting" && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-zinc-400">
                    <Loader2 size={16} className="animate-spin" aria-hidden />
                    Picking a buyer who can afford it…
                  </div>
                )}
                {phase !== "starting" && duel && (
                  <PriceDuel duel={duel} revealed={revealed} live={showLive && phase === "live"} />
                )}
                {phase === "reel" && !duel && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                    <p className="text-lg font-medium text-white">No deals on the floor yet.</p>
                    <p className="mt-2 max-w-[34ch] text-sm text-zinc-400">
                      Run the demo and watch the first one draw itself here.
                    </p>
                  </div>
                )}
              </div>
            </Spotlight>

            <figcaption className="mt-3 min-h-[2.75rem] px-1 text-sm text-zinc-500">
              {phase === "error" ? (
                <span role="alert" className="text-rose-300">
                  {error}{" "}
                  <button type="button" onClick={() => void runDemo()} className="font-medium underline underline-offset-2">
                    Try again
                  </button>
                </span>
              ) : phase === "done" ? (
                <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  <Link href="/world" className="inline-flex min-h-[40px] items-center gap-1.5 font-medium text-emerald-300 hover:text-emerald-200">
                    Watch it on the 3D floor
                    <ArrowUpRight size={15} aria-hidden />
                  </Link>
                  <Link href="/negotiate?demo=1" className="inline-flex min-h-[40px] items-center gap-1.5 text-zinc-300 hover:text-white">
                    Open the full negotiation
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                  <button type="button" onClick={() => void runDemo()} className="inline-flex min-h-[40px] items-center gap-1.5 text-zinc-400 hover:text-white">
                    <RotateCcw size={14} aria-hidden />
                    Run another
                  </button>
                </span>
              ) : busy ? (
                "Running live against the real marketplace."
              ) : (
                "Replaying real deals from the marketplace. Run the demo to start a new one."
              )}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

/** 1px border that lights up under the pointer. */
function Spotlight({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
        el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
      }}
      className="hero-spotlight rounded-[22px] p-px"
    >
      {children}
    </div>
  );
}
