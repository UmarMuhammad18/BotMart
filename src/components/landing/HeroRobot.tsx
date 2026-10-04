"use client";

import Image from "next/image";

/**
 * Hero agent visual — transparent PNG at public/hero-robot.png
 */
export function HeroRobot() {
  return (
    <div className="relative w-full max-w-[200px] xs:max-w-[240px] sm:max-w-[300px] md:max-w-[320px] mx-auto">
      <div
        className="pointer-events-none absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[90%] h-[55%] rounded-full bg-emerald-500/25 blur-3xl"
        aria-hidden
      />

      <div className="relative aspect-[9/16] w-full">
        <Image
          src="/hero-robot.png"
          alt="BotMart autonomous commerce agent"
          fill
          priority
          className="object-contain object-bottom drop-shadow-[0_24px_48px_rgba(16,185,129,0.3)]"
          sizes="(max-width: 640px) 200px, (max-width: 768px) 280px, 320px"
        />
      </div>

      <div className="absolute top-[8%] left-0 sm:-left-2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 backdrop-blur-sm">
        Buyer
      </div>
      <div className="absolute bottom-[12%] right-0 sm:-right-2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 backdrop-blur-sm">
        Seller
      </div>
    </div>
  );
}
