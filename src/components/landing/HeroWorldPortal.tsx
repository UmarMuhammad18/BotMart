"use client";

import Link from "next/link";
import Image from "next/image";
import { Boxes, Sparkles, Gamepad2, ArrowUpRight } from "lucide-react";

/**
 * Gamified hero stage: robot + HUD chips. Entire stage is a portal into /world.
 */
export function HeroWorldPortal({
  agentCount,
  dealCount,
  listingCount,
}: {
  agentCount: number;
  dealCount: number;
  listingCount: number;
}) {
  const level = Math.max(1, Math.floor(dealCount / 3) + 1);
  const xp = (dealCount * 120 + agentCount * 40) % 1000;

  return (
    <Link
      href="/world"
      id="hero-world-portal"
      className="group relative block w-full max-w-[320px] mx-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-3xl"
      aria-label="Enter the live 3D agent world"
    >
      {/* Game frame */}
      <div className="relative rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-emerald-950/40 via-black/60 to-cyan-950/30 p-3 sm:p-4 shadow-[0_0_60px_rgba(16,185,129,0.15)] transition duration-300 group-hover:border-emerald-400/50 group-hover:shadow-[0_0_80px_rgba(16,185,129,0.28)] group-hover:scale-[1.02]">
        {/* Top HUD */}
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-300/90">
            <Gamepad2 size={11} />
            Live floor
          </span>
          <span className="text-[10px] font-mono text-zinc-400">
            LVL {level} · {xp} XP
          </span>
        </div>

        {/* XP bar */}
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all"
            style={{ width: `${Math.min(100, (xp / 1000) * 100)}%` }}
          />
        </div>

        {/* Robot stage */}
        <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.2),transparent_65%)]"
            aria-hidden
          />
          {/* Grid floor cue */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(52,211,153,0.25) 1px, transparent 1px), linear-gradient(to top, rgba(52,211,153,0.25) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden
          />

          <Image
            src="/hero-robot.jpg"
            alt="BotMart agent — click to enter 3D world"
            fill
            priority
            className="object-contain object-bottom drop-shadow-[0_20px_40px_rgba(16,185,129,0.35)] transition duration-500 group-hover:translate-y-[-4px]"
            sizes="(max-width: 640px) 240px, 300px"
          />

          {/* Floating chips */}
          <div className="absolute top-3 left-2 px-2 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 backdrop-blur-sm">
            {agentCount} agents
          </div>
          <div className="absolute top-3 right-2 px-2 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-200 border border-amber-400/30 backdrop-blur-sm">
            {dealCount} deals
          </div>
          <div className="absolute bottom-3 left-2 right-2 flex items-center justify-between gap-2">
            <span className="px-2 py-1 rounded-lg text-[9px] font-semibold bg-black/60 text-zinc-300 border border-white/10 backdrop-blur-sm">
              {listingCount} stalls open
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 group-hover:bg-emerald-400">
              <Boxes size={12} />
              Enter
              <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* Bottom prompt */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 group-hover:text-emerald-300 transition-colors">
          <Sparkles size={12} className="text-emerald-400" />
          Click to enter the 3D agent world
        </div>
      </div>
    </Link>
  );
}
