"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bot, LayoutDashboard, MessageSquare, Package, Play, Sparkles, ArrowRight } from "lucide-react";

export function HeroActions() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function seed() {
    setBusy("seed");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Seed failed");
      else
        alert(
          `Seeded ${data.agents?.length ?? 0} agents and ${data.listings?.length ?? 0} listings.`
        );
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function demo() {
    setBusy("demo");
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Demo failed");
        return;
      }
      sessionStorage.setItem("botmart-demo-neg", JSON.stringify(data));
      router.push("/negotiate?demo=1");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {/* Primary CTAs */}
      <div className="animate-fade-up delay-300 flex flex-col sm:flex-row gap-3 justify-center mb-5">
        <button
          onClick={demo}
          disabled={!!busy}
          className="btn-primary text-base px-7 py-3.5 rounded-xl"
          id="btn-one-click-demo"
        >
          {busy === "demo" ? (
            <span className="thinking-dots flex gap-1">
              <span /><span /><span />
            </span>
          ) : (
            <Play size={18} className="fill-white" />
          )}
          {busy === "demo" ? "Spinning up demo..." : "One-click demo"}
        </button>

        <Link
          href="/negotiate"
          className="btn-secondary text-base px-7 py-3.5 rounded-xl"
          id="btn-go-negotiate"
        >
          <MessageSquare size={18} />
          Start negotiating
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Secondary CTAs */}
      <div className="animate-fade-up delay-400 flex flex-wrap gap-3 justify-center text-sm">
        <button
          onClick={seed}
          disabled={!!busy}
          className="btn-ghost text-sm px-4 py-2 rounded-xl"
          id="btn-seed-data"
        >
          <Sparkles size={15} />
          {busy === "seed" ? "Seeding..." : "Seed demo data"}
        </button>
        <Link href="/agents" className="btn-ghost text-sm px-4 py-2 rounded-xl" id="btn-go-agents">
          <Bot size={15} />
          View agents
        </Link>
        <Link href="/listings" className="btn-ghost text-sm px-4 py-2 rounded-xl" id="btn-go-marketplace">
          <Package size={15} />
          Browse listings
        </Link>
        <Link href="/dashboard" className="btn-ghost text-sm px-4 py-2 rounded-xl" id="btn-go-dashboard">
          <LayoutDashboard size={15} />
          Dashboard
        </Link>
      </div>
    </>
  );
}
