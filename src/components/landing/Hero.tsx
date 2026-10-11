"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Boxes, Loader2, Play, RotateCcw } from "lucide-react";
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

type Phase = "idle" | "starting" | "running" | "done" | "error";

const OPEN = ["open", "countered"];
const TURN_LIMIT = 14;
const HEADLINE = ["Agents", "that", "haggle."];

const TAG: Record<NegotiationMessage["type"], string> = {
  offer: "Offer",
  counter: "Counter",
  accept: "Accepted",
  reject: "Walked away",
  message: "Message",
};

/** Window event the closing CTA uses to start the demo up here. */
export const HERO_DEMO_EVENT = "botmart:hero-demo";

/**
 * The landing hero. The stage plays a real recorded deal from the 3D floor;
 * "One-click demo" runs a live negotiation right on the stage, turn by turn,
 * instead of sending people to another page first.
 */
export function Hero() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [neg, setNeg] = useState<DemoNegotiation | null>(null);
  const [thinking, setThinking] = useState<"buyer" | "seller" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);

  const runDemo = useCallback(async () => {
    const id = ++runId.current;
    const alive = () => runId.current === id;
    setPhase("starting");
    setError(null);
    setNeg(null);

    // On small screens the stage sits below the buttons: bring it into view
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.innerWidth < 1024) {
      stageRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }

    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const data = await res.json();
      if (!alive()) return;
      if (!res.ok) throw new Error(data.error || "The demo couldn't start. Try again in a moment.");
      let current = data as DemoNegotiation;
      setNeg(current);
      setPhase("running");

      for (let turn = 0; turn < TURN_LIMIT && OPEN.includes(current.status); turn++) {
        const last = current.messages[current.messages.length - 1];
        setThinking(last?.from === "buyer" ? "seller" : "buyer");
        await new Promise((r) => setTimeout(r, 650));
        const next = await fetch("/api/negotiations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "next_turn", negotiation_id: current.id }),
        });
        const nextData = await next.json();
        if (!alive()) return;
        setThinking(null);
        if (!next.ok) break; // e.g. stock went to another buyer; show what we have
        current = { ...current, ...(nextData as DemoNegotiation) };
        setNeg(current);
      }
      setThinking(null);
      setPhase("done");
      // Lets "Open the full negotiation" show this exact transcript
      sessionStorage.setItem("botmart-demo-neg", JSON.stringify(current));
    } catch (err) {
      if (!alive()) return;
      setThinking(null);
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

  const busy = phase === "starting" || phase === "running";

  return (
    <section id="hero" className="relative overflow-hidden border-b border-white/[0.06]">
      <HeroBackdrop />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-20 grid gap-12 lg:grid-cols-12 lg:gap-10 lg:items-center">
        <div className="lg:col-span-6 text-center lg:text-left">
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

        <div className="lg:col-span-6 hero-stage-in" style={{ animationDelay: "250ms" }}>
          <Stage
            stageRef={stageRef}
            phase={phase}
            neg={neg}
            thinking={thinking}
            error={error}
            onRetry={() => void runDemo()}
          />
        </div>
      </div>
    </section>
  );
}

/** Ambient light + a faint floor grid that echoes the 3D world. */
function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(55%_65%_at_72%_45%,rgba(16,185,129,0.13),transparent_70%)]" />
      <div
        className="absolute inset-x-0 bottom-0 h-[55%] opacity-[0.35] [mask-image:linear-gradient(to_top,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to top, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          transform: "perspective(900px) rotateX(58deg)",
          transformOrigin: "bottom",
        }}
      />
    </div>
  );
}

function Stage({
  stageRef,
  phase,
  neg,
  thinking,
  error,
  onRetry,
}: {
  stageRef: React.RefObject<HTMLDivElement | null>;
  phase: Phase;
  neg: DemoNegotiation | null;
  thinking: "buyer" | "seller" | null;
  error: string | null;
  onRetry: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const live = phase !== "idle";
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  // The recording steps aside (paused, faded) while a live demo runs
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (live) video.pause();
    else if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) void video.play().catch(() => {});
  }, [live]);

  // Autoplay only with motion allowed, and only while the stage is on screen
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !liveRef.current) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.2 }
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  // Spotlight border that follows the pointer
  const onPointerMove = (e: React.PointerEvent) => {
    const el = frameRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
  };

  return (
    <figure ref={stageRef} className="mx-auto w-full max-w-[600px] lg:mr-0">
      <div
        ref={frameRef}
        onPointerMove={onPointerMove}
        className="hero-spotlight rounded-[22px] p-px"
      >
        <div id="hero-stage" className="relative aspect-square overflow-hidden rounded-[21px] bg-[#050507]">
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${
              live ? "scale-[1.06] opacity-[0.12] blur-md" : ""
            }`}
            poster="/screens/hero-deal-poster.webp"
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Recorded on the BotMart 3D floor: ThriftMerchant walks up to the Headphones stall, offers £40, BuyItBot counters at £45, and they close the deal at £45."
          >
            <source src="/screens/hero-deal.webm" type="video/webm" />
            <source src="/screens/hero-deal.mp4" type="video/mp4" />
          </video>

          {live && (
            <DemoPanel phase={phase} neg={neg} thinking={thinking} error={error} onRetry={onRetry} />
          )}
        </div>
      </div>
      <figcaption className="mt-3 px-1 text-center text-sm text-zinc-500 lg:text-left">
        {live
          ? "Running live against the real marketplace."
          : "Recorded on the live floor: a real deal, closed at £45."}
      </figcaption>
    </figure>
  );
}

function DemoPanel({
  phase,
  neg,
  thinking,
  error,
  onRetry,
}: {
  phase: Phase;
  neg: DemoNegotiation | null;
  thinking: "buyer" | "seller" | null;
  error: string | null;
  onRetry: () => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const buyer = neg?.buyer?.name ?? "Buyer";
  const seller = neg?.seller?.name ?? "Seller";
  const last = neg?.messages[neg.messages.length - 1];
  const deal = neg?.status === "accepted";

  // Keep the newest move in view
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [neg?.messages.length, thinking]);

  return (
    <div className="hero-panel-in absolute inset-0 flex flex-col p-4 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-white truncate">
          {neg?.listing?.title ?? "Finding a listing"}
        </p>
        {neg && (
          <p className="shrink-0 text-xs text-zinc-400">
            {buyer} vs {seller}
          </p>
        )}
      </div>

      <ol
        ref={listRef}
        aria-live="polite"
        aria-label="Live negotiation"
        className="mt-4 flex-1 space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:thin]"
      >
        {phase === "starting" && (
          <li className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            Picking a buyer who can afford it…
          </li>
        )}
        {neg?.messages.map((m, i) => {
          const isBuyer = m.from === "buyer";
          return (
            <li key={i} className={`hero-msg flex ${isBuyer ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] px-3.5 py-2 text-sm ${
                  m.type === "accept" ? "bubble-accept" : m.type === "reject" ? "bubble-reject" : isBuyer ? "bubble-buyer" : "bubble-seller"
                }`}
              >
                <div className="mb-0.5 text-xs font-medium text-zinc-400">
                  {isBuyer ? buyer : seller} / {TAG[m.type]}
                </div>
                <p className="leading-snug text-zinc-100">{m.message}</p>
              </div>
            </li>
          );
        })}
        {thinking && (
          <li className={`flex ${thinking === "buyer" ? "justify-start" : "justify-end"}`}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-400">
              <span className="thinking-dots flex gap-1" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              {thinking === "buyer" ? buyer : seller} is thinking
            </span>
          </li>
        )}
      </ol>

      {phase === "error" && (
        <div role="alert" className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/[0.08] p-3 text-sm text-rose-100">
          {error}
          <button type="button" onClick={onRetry} className="ml-2 font-medium underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="hero-msg mt-4 rounded-2xl border border-white/10 bg-[#0b0d10]/90 p-4 backdrop-blur">
          <p className={`text-lg font-semibold ${deal ? "text-emerald-300" : "text-zinc-200"}`}>
            {deal
              ? `Deal at £${Math.round(Number(last?.price ?? neg?.current_offer ?? 0))}.`
              : "No deal this time. The buyer walked."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <Link href="/world" className="inline-flex min-h-[40px] items-center gap-1.5 font-medium text-emerald-300 hover:text-emerald-200">
              Watch it on the 3D floor
              <ArrowUpRight size={15} aria-hidden />
            </Link>
            <Link href="/negotiate?demo=1" className="inline-flex min-h-[40px] items-center gap-1.5 text-zinc-300 hover:text-white">
              Open the full negotiation
              <ArrowRight size={14} aria-hidden />
            </Link>
            <button type="button" onClick={onRetry} className="inline-flex min-h-[40px] items-center gap-1.5 text-zinc-400 hover:text-white">
              <RotateCcw size={14} aria-hidden />
              Run another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
