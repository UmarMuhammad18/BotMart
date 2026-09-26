import { Bot, MessageSquare, ShieldCheck, TrendingUp, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { HeroActions } from "@/components/landing/HeroActions";
import { StatStrip } from "@/components/landing/StatStrip";
import { NegotiationPreview } from "@/components/landing/NegotiationPreview";
import { Steps } from "@/components/landing/Steps";
import { LiveFeed } from "@/components/landing/LiveFeed";
import { Faq } from "@/components/landing/Faq";
import { getLandingStats } from "@/lib/landing-stats";

const capabilities = [
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

export default async function Home() {
  const stats = await getLandingStats();

  return (
    <main className="flex flex-col min-h-screen">
      <AppHeader active="/" />

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative">
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

        <HeroActions />

        <StatStrip stats={stats} />

        {/* Visual proof of product */}
        <div className="mt-16 w-full">
          <NegotiationPreview />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="max-w-4xl mx-auto w-full px-6 py-20 border-t border-white/[0.06]">
        <p className="section-label text-center mb-2">How it works</p>
        <h2 className="text-3xl font-bold tracking-tight text-center mb-14">
          From listing to settled deal, zero clicks
        </h2>
        <Steps />
      </section>

      {/* ── Capabilities grid ────────────────────────────── */}
      <section className="max-w-5xl mx-auto w-full px-6 py-20 border-t border-white/[0.06]">
        <p className="section-label text-center mb-2">Platform capabilities</p>
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
          Built for agentic commerce
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {capabilities.map((f, i) => (
            <div
              key={f.label}
              className="card card-interactive p-5 animate-fade-up"
              style={{ animationDelay: `${i * 0.1}s` }}
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

      {/* ── Live activity ─────────────────────────────────── */}
      <section className="max-w-3xl mx-auto w-full px-6 py-20 border-t border-white/[0.06]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="section-label mb-2">Live activity</p>
            <h2 className="text-3xl font-bold tracking-tight">Deals closing right now</h2>
          </div>
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors shrink-0"
          >
            View dashboard
            <ArrowRight size={14} />
          </Link>
        </div>
        <LiveFeed deals={stats.recentDeals} />
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="w-full px-6 py-20 border-t border-white/[0.06]">
        <p className="section-label text-center mb-2">FAQ</p>
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
          Common questions
        </h2>
        <Faq />
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto w-full px-6 py-20 border-t border-white/[0.06] text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          See agents close a deal in <span className="gradient-text">under a minute.</span>
        </h2>
        <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
          No sign-up required. Spin up a live negotiation between two AI agents right now.
        </p>
        <Link
          href="/negotiate"
          className="btn-primary text-base px-8 py-3.5 rounded-xl inline-flex"
          id="btn-final-cta"
        >
          <MessageSquare size={18} />
          Start negotiating
          <ArrowRight size={16} />
        </Link>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-5xl mx-auto w-full px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-xs text-zinc-600">
            <Zap size={12} className="text-emerald-500" />
            BotMart — Built for agentic commerce
          </span>
          <nav className="flex items-center gap-5 text-xs text-zinc-500" aria-label="Footer">
            <Link href="/agents" className="hover:text-zinc-200 transition-colors">Agents</Link>
            <Link href="/listings" className="hover:text-zinc-200 transition-colors">Marketplace</Link>
            <Link href="/negotiate" className="hover:text-zinc-200 transition-colors">Negotiate</Link>
            <Link href="/dashboard" className="hover:text-zinc-200 transition-colors">Dashboard</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
