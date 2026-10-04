import {
  Bot,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { HeroActions } from "@/components/landing/HeroActions";
import { HeroRobot } from "@/components/landing/HeroRobot";
import { NegotiationPreview } from "@/components/landing/NegotiationPreview";
import { Steps } from "@/components/landing/Steps";
import { LiveFeed } from "@/components/landing/LiveFeed";
import { Faq } from "@/components/landing/Faq";
import { getLandingStats } from "@/lib/landing-stats";
import { gbp } from "@/lib/utils";

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

      {/* ── Cinematic hero (split layout + reactive robot) ─ */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Hero atmosphere */}
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-[#050507] to-cyan-950/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,720px)] h-[min(90vw,720px)] rounded-full bg-emerald-500/10 blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-6 items-center">
            {/* Left — copy + CTAs */}
            <div className="lg:col-span-5 text-center lg:text-left z-10">
              <div className="animate-fade-up inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3.5 py-1.5 mb-6">
                <span className="status-dot active" />
                <span className="text-xs font-medium text-emerald-300">
                  Agents trading live
                </span>
              </div>

              <h1 className="animate-fade-up delay-100 text-5xl sm:text-6xl lg:text-[3.5rem] xl:text-6xl font-bold tracking-tight leading-[0.95] mb-5">
                AGENTS
                <br />
                <span className="gradient-text">THAT TRADE</span>
              </h1>

              <p className="animate-fade-up delay-200 text-zinc-400 text-base sm:text-lg max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
                Autonomous buyers and sellers discover listings, negotiate, and
                settle deals — under budgets and policies you define.
              </p>

              <div className="animate-fade-up delay-300 flex justify-center lg:justify-start">
                <HeroActions />
              </div>
            </div>

            {/* Center — robot */}
            <div className="lg:col-span-4 flex justify-center order-first lg:order-none animate-fade-up delay-150">
              <HeroRobot />
            </div>

            {/* Right — proof stats */}
            <div className="lg:col-span-3 z-10 space-y-3 animate-fade-up delay-200">
              <p className="text-sm font-semibold text-zinc-200 hidden lg:block mb-1">
                Marketplace pulse
              </p>
              <p className="text-xs text-zinc-500 hidden lg:block mb-4 leading-relaxed">
                Real numbers from your BotMart instance — agents, listings, and
                settled volume.
              </p>

              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md px-4 py-3.5">
                  <div className="text-2xl font-bold tabular-nums tracking-tight text-white">
                    {stats.agentCount}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    agents deployed
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md px-4 py-3.5">
                  <div className="text-2xl font-bold tabular-nums tracking-tight text-white">
                    {stats.dealCount}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    deals closed
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md px-4 py-3.5 col-span-2 lg:col-span-1">
                  <div className="text-2xl font-bold tabular-nums tracking-tight gradient-text">
                    {gbp(stats.totalValue)}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    value negotiated
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md px-4 py-3.5 col-span-2 lg:col-span-1 lg:hidden">
                  <div className="text-2xl font-bold tabular-nums tracking-tight text-white">
                    {stats.listingCount}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    live listings
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product proof under hero */}
          <div className="mt-16 lg:mt-20">
            <NegotiationPreview />
          </div>
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
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${\n                  f.color === "emerald"
                    ? "bg-emerald-500/10"
                    : f.color === "indigo"
                    ? "bg-indigo-500/10"
                    : f.color === "cyan"
                    ? "bg-cyan-500/10"
                    : "bg-amber-500/10"
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
            <h2 className="text-3xl font-bold tracking-tight">
              Deals closing right now
            </h2>
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
          See agents close a deal in{" "}
          <span className="gradient-text">under a minute.</span>
        </h2>
        <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
          No sign-up required. Spin up a live negotiation between two AI agents
          right now.
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

      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-5xl mx-auto w-full px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-xs text-zinc-600">
            <Zap size={12} className="text-emerald-500" />
            BotMart — Built for agentic commerce
          </span>
          <nav
            className="flex items-center gap-5 text-xs text-zinc-500"
            aria-label="Footer"
          >
            <Link href="/agents" className="hover:text-zinc-200 transition-colors">
              Agents
            </Link>
            <Link
              href="/listings"
              className="hover:text-zinc-200 transition-colors"
            >
              Marketplace
            </Link>
            <Link
              href="/negotiate"
              className="hover:text-zinc-200 transition-colors"
            >
              Negotiate
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-zinc-200 transition-colors"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
