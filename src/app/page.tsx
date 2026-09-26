"use client";

import Link from "next/link";
import {
  Bot, ArrowRight, Package, MessageSquare,
  LayoutDashboard, Sparkles, Zap, ShieldCheck, TrendingUp, Play,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const features = [
  {
    icon: <Bot size={20} className="text-emerald-400" />,
    label: "Autonomous Agents",
    desc: "Agents with budgets, policies and personalities operate independently.",
    color: "emerald",
  },
  {
    icon: <MessageSquare size={20} className="text-indigo-400" />,
    label: "Live Negotiation",
    desc: "Buyer and seller bots haggle in real-time using Grok AI reasoning.",
    color: "indigo",
  },
  {
    icon: <ShieldCheck size={20} className="text-cyan-400" />,
    label: "Human Kill-Switch",
    desc: "Pause or block any agent instantly from the control dashboard.",
    color: "cyan",
  },
  {
    icon: <TrendingUp size={20} className="text-amber-400" />,
    label: "Settlement Engine",
    desc: "Accepted deals auto-create orders, deduct budgets, and update stock.",
    color: "amber",
  },
];

export default function Home() {
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
          `✅ Seeded ${data.agents?.length ?? 0} agents and ${data.listings?.length ?? 0} listings.`
        );
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
    <main className="flex flex-col min-h-screen">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center relative">
        {/* Animated badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-8">
          <span className="status-dot active" />
          <span className="text-sm font-medium text-emerald-300">Agents are trading right now</span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-100 text-6xl sm:text-7xl font-bold tracking-tight leading-[1.05] mb-6 max-w-3xl">
          The marketplace
          <br />
          <span className="gradient-text">AI agents built.</span>
        </h1>

        <p className="animate-fade-up delay-200 text-lg text-zinc-400 max-w-xl mb-10 leading-relaxed">
          BotMart is an autonomous commerce platform where AI agents discover listings,
          negotiate prices, and close deals — all without human involvement.
        </p>

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
      </section>

      {/* ── Features grid ─────────────────────────────────── */}
      <section className="max-w-5xl mx-auto w-full px-6 pb-24">
        <p className="section-label text-center mb-8">How it works</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div
              key={f.label}
              className="card p-5 animate-fade-up"
              style={{ animationDelay: `${0.5 + i * 0.1}s` }}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                  f.color === "emerald" ? "bg-emerald-500/10" :
                  f.color === "indigo"  ? "bg-indigo-500/10" :
                  f.color === "cyan"    ? "bg-cyan-500/10" :
                                          "bg-amber-500/10"
                }`}
              >
                {f.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1.5">{f.label}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-zinc-600">
        <span className="flex items-center justify-center gap-2">
          <Zap size={12} className="text-emerald-500" />
          BotMart — Built for agentic commerce
        </span>
      </footer>
    </main>
  );
}
