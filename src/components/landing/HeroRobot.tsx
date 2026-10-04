"use client";

import Image from "next/image";

/**
 * Hero agent visual — static product shot (cursor reactivity can come later).
 * Place the asset at public/hero-robot.jpg
 */
export function HeroRobot() {
  return (
    <div className="relative w-full max-w-[280px] sm:max-w-[340px] mx-auto">
      {/* Soft glow behind the figure */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full bg-emerald-500/20 blur-3xl scale-90"
        aria-hidden
      />

      <div className="relative aspect-[2/3] w-full">
        <Image
          src="/hero-robot.jpg"
          alt="BotMart autonomous commerce agent"
          fill
          priority
          className="object-contain drop-shadow-[0_20px_50px_rgba(16,185,129,0.25)]"
          sizes="(max-width: 640px) 280px, 340px"
        />
      </div>

      <div className="absolute top-[10%] left-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 backdrop-blur-sm">
        Buyer
      </div>
      <div className="absolute bottom-[18%] right-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 backdrop-blur-sm">
        Seller
      </div>
    </div>
  );
}
