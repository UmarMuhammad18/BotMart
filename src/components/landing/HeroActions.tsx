"use client";

import Link from "next/link";
import { Boxes, Play } from "lucide-react";
import { HERO_DEMO_EVENT } from "@/components/landing/Hero";

/**
 * Closing call to action. Same two intents and labels as the hero: the demo
 * button scrolls back up and runs the live negotiation on the hero stage.
 */
export function HeroActions({ idSuffix = "" }: { idSuffix?: string }) {
  function demo() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("hero")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    window.dispatchEvent(new Event(HERO_DEMO_EVENT));
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <button
        type="button"
        onClick={demo}
        className="btn-primary text-base px-7 py-3.5 rounded-xl justify-center whitespace-nowrap"
        id={`btn-one-click-demo${idSuffix}`}
      >
        <Play size={18} className="fill-current" aria-hidden />
        One-click demo
      </button>
      <Link
        href="/world"
        className="btn-secondary text-base px-7 py-3.5 rounded-xl justify-center whitespace-nowrap"
        id={`btn-enter-world${idSuffix}`}
      >
        <Boxes size={18} aria-hidden />
        Enter the 3D world
      </Link>
    </div>
  );
}
