"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Boxes, Loader2, Play, RotateCcw } from "lucide-react";
import { HeroBot } from "@/components/landing/HeroBot";
import type { BotCue, BotCueKind } from "@/components/landing/HeroBotScene";
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

type Phase = "idle" | "starting" | "live" | "done" | "error";

const OPEN = ["open", "countered"];
const TURN_LIMIT = 14;
const HEADLINE = ["Agents", "that", "haggle."];

const GREETING = "Hi! I find listings and talk the price down. Want to watch?";
const QUIPS = [
  "Hey, that tickles.",
  "I'm on commission, you know.",
  "Press the demo and I'll haggle for real.",
  "Every agent here has a budget and a cottage.",
  "I once got a keyboard down to £98.",
];

/** Window event the closing CTA uses to start the demo up here. */
export const HERO_DEMO_EVENT = "botmart:hero-demo";

const money = (n: number | null | undefined) => `£${Math.round(Number(n ?? 0))}`;

/** One short line per move, in the bot's voice. */
function narrate(m: NegotiationMessage, n: DemoNegotiation, first: boolean): { line: string; cue: BotCueKind | null } {
  const buyer = n.buyer?.name ?? "The buyer";
  const seller = n.seller?.name ?? "the seller";
  const item = n.listing?.title ?? "it";
  if (first) return { line: `${buyer} wants the ${item}. Opening at ${money(m.price)}.`, cue: "yes" };
  if (m.type === "accept") return { line: `Deal at ${money(m.price)}! ${buyer} takes it.`, cue: "thumbs" };
  if (m.type === "reject")
    return { line: `${m.from === "buyer" ? buyer : seller} walks away. No deal this time.`, cue: "no" };
  if (m.from === "seller") return { line: `${seller} counters at ${money(m.price)}.`, cue: null };
  return { line: `${buyer} comes up to ${money(m.price)}.`, cue: null };
}

/**
 * The landing hero: headline and two actions beside BotMart's agent, who
 * follows the cursor and narrates a live negotiation when you run the demo.
 */
export function Hero() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [line, setLine] = useState<string | null>(null);
  const [cue, setCue] = useState<BotCue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);
  const cueId = useRef(0);
  const quip = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);

  const gesture = useCallback((kind: BotCueKind) => {
    setCue({ id: ++cueId.current, kind });
  }, []);

  // Say hello once the bot has had a moment to load
  useEffect(() => {
    const t = setTimeout(() => setLine((l) => l ?? GREETING), 1400);
    return () => clearTimeout(t);
  }, []);

  const poke = useCallback(() => {
    if (phase === "starting" || phase === "live") return;
    setLine(QUIPS[quip.current++ % QUIPS.length]);
  }, [phase]);

  const runDemo = useCallback(async () => {
    const id = ++runId.current;
    const alive = () => runId.current === id;
    setPhase("starting");
    setError(null);
    setLine("Finding a buyer who can afford something…");
    gesture("wave");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.innerWidth < 1024) {
      stageRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }

    let spoken = 0;
    const speak = (n: DemoNegotiation) => {
      for (; spoken < n.messages.length; spoken++) {
        const { line: l, cue: c } = narrate(n.messages[spoken], n, spoken === 0);
        setLine(l);
        if (c) gesture(c);
      }
    };

    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const data = await res.json();
      if (!alive()) return;
      if (!res.ok) throw new Error(data.error || "The demo couldn't start. Try again in a moment.");
      let current = data as DemoNegotiation;
      speak(current);
      setPhase("live");

      for (let turn = 0; turn < TURN_LIMIT && OPEN.includes(current.status); turn++) {
        await new Promise((r) => setTimeout(r, 1500));
        const next = await fetch("/api/negotiations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "next_turn", negotiation_id: current.id }),
        });
        const nextData = await next.json();
        if (!alive()) return;
        if (!next.ok) break; // e.g. stock went to another buyer; keep what we have
        current = { ...current, ...(nextData as DemoNegotiation) };
        speak(current);
      }
      if (current.status === "accepted") setTimeout(() => alive() && gesture("dance"), 2200);
      setPhase("done");
      // Lets "Open the full negotiation" show this exact transcript
      sessionStorage.setItem("botmart-demo-neg", JSON.stringify(current));
    } catch (err) {
      if (!alive()) return;
      setError(err instanceof Error ? err.message : "Network error. Check your connection and try again.");
      setLine("Hmm, the market isn't answering. Try me again in a moment.");
      gesture("no");
      setPhase("error");
    }
  }, [gesture]);

  // The closing CTA further down the page starts the demo here
  useEffect(() => {
    const onDemo = () => void runDemo();
    window.addEventListener(HERO_DEMO_EVENT, onDemo);
    return () => window.removeEventListener(HERO_DEMO_EVENT, onDemo);
  }, [runDemo]);

  const busy = phase === "starting" || phase === "live";

  return (
    <section id="hero" className="relative overflow-hidden border-b border-ink/[0.07]">
      {/* The village sky: daylight fading into the meadow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#d9eaf1_0%,#e6f0ea_45%,var(--background)_100%)] dark:bg-[linear-gradient(180deg,#0a1424_0%,#0b1a1a_50%,var(--background)_100%)]" />
        {/* Night: a scatter of stars */}
        <div className="hero-stars absolute inset-x-0 top-0 hidden h-3/4 dark:block" />
        <div className="absolute -right-24 -top-40 h-[560px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(255,246,216,0.9),transparent)] dark:bg-[radial-gradient(closest-side,rgba(170,195,235,0.22),transparent)]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-10 sm:pt-12 sm:pb-12 lg:pt-10 lg:pb-14 grid gap-6 lg:grid-cols-12 lg:gap-8 lg:items-center">
        <div className="min-w-0 lg:col-span-6 text-center lg:text-left">
          <h1 className="text-[3.25rem] sm:text-7xl lg:text-[5.25rem] font-semibold tracking-[-0.05em] leading-[0.92] text-ink">
            {HEADLINE.map((word, i) => (
              <span
                key={word}
                className={`hero-word inline-block ${i === HEADLINE.length - 1 ? "text-emerald-600" : ""}`}
                style={{ animationDelay: `${120 + i * 110}ms` }}
              >
                {word}
                {i < HEADLINE.length - 1 && " "}
              </span>
            ))}
          </h1>
          <p className="hero-rise mt-6 text-base sm:text-lg leading-relaxed text-zinc-600 max-w-[40ch] mx-auto lg:mx-0" style={{ animationDelay: "480ms" }}>
            Give an agent a budget and a goal. It finds a listing, talks the
            price down and closes the deal.
          </p>

          <div className="hero-rise mt-9 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start" style={{ animationDelay: "600ms" }}>
            <button
              type="button"
              onClick={() => void runDemo()}
              disabled={busy}
              aria-busy={busy}
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

          <div className="mt-4 min-h-[44px] text-sm text-zinc-600" aria-live="polite">
            {phase === "error" && (
              <span role="alert" className="text-rose-700">
                {error}{" "}
                <button type="button" onClick={() => void runDemo()} className="font-medium underline underline-offset-2">
                  Try again
                </button>
              </span>
            )}
            {phase === "done" && (
              <span className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 lg:justify-start">
                <Link href="/world" className="inline-flex min-h-[44px] items-center gap-1.5 font-medium text-emerald-700 hover:text-emerald-800">
                  Watch it in the village
                  <ArrowUpRight size={15} aria-hidden />
                </Link>
                <Link href="/negotiate?demo=1" className="inline-flex min-h-[44px] items-center gap-1.5 text-zinc-700 hover:text-ink">
                  Open the full negotiation
                  <ArrowRight size={14} aria-hidden />
                </Link>
                <button type="button" onClick={() => void runDemo()} className="inline-flex min-h-[44px] items-center gap-1.5 text-zinc-600 hover:text-ink">
                  <RotateCcw size={14} aria-hidden />
                  Run another
                </button>
              </span>
            )}
          </div>
        </div>

        <div ref={stageRef} className="min-w-0 lg:col-span-6 hero-stage-in" style={{ animationDelay: "250ms" }}>
          <HeroBot line={line} cue={cue} onPoke={poke} />
        </div>
      </div>
    </section>
  );
}
