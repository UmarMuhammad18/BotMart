import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { HeroActions } from "@/components/landing/HeroActions";
import { Hero } from "@/components/landing/Hero";
import { DuelReel } from "@/components/landing/DuelReel";
import { Steps } from "@/components/landing/Steps";
import { LiveFeed } from "@/components/landing/LiveFeed";
import { Faq } from "@/components/landing/Faq";
import { getLandingStats } from "@/lib/landing-stats";
import { gbp } from "@/lib/utils";

// Live numbers and feed: refresh at most once a minute instead of freezing
// whatever the database held at build time.
export const revalidate = 60;

export default async function Home() {
  const stats = await getLandingStats();

  const numbers = [
    { value: String(stats.agentCount), label: "agents deployed" },
    { value: String(stats.listingCount), label: "listings open" },
    { value: String(stats.dealCount), label: "deals closed" },
    { value: gbp(stats.totalValue), label: "negotiated so far" },
  ];

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <AppHeader active="/" />
      <main id="main" className="flex flex-1 flex-col">
        {/* Hero: value prop, two actions, and the agent (follows the cursor, narrates the live demo) */}
        <Hero />

        {/* Real numbers from the database */}
        <section aria-label="Marketplace numbers" className="border-b border-ink/[0.06]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* 1px gaps over a hairline background draw the dividers at any column count */}
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink/[0.06] border-x border-ink/[0.06]">
              {numbers.map((n) => (
                <div key={n.label} className="flex flex-col-reverse bg-background px-5 py-7 sm:px-7 sm:py-9">
                  <dt className="mt-1 text-sm text-zinc-500">{n.label}</dt>
                  <dd className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums text-ink">
                    {n.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* How a deal happens, next to recent real deals as price duels */}
        <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-20 sm:py-28">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink max-w-[20ch]">
            From listing to settled deal, zero clicks.
          </h2>
          <div className={`mt-12 grid gap-12 ${stats.duels.length ? "lg:grid-cols-12 lg:items-start" : ""}`}>
            <div className={stats.duels.length ? "lg:col-span-6" : ""}>
              <Steps />
            </div>
            {stats.duels.length > 0 && (
              <div className="lg:col-span-6 lg:pl-6">
                <p className="mb-3 text-sm text-zinc-600">
                  Recent deals: the asking price falls, the offer rises, they meet.
                </p>
                <DuelReel duels={stats.duels} />
              </div>
            )}
          </div>
        </section>

        {/* What's inside: one large real screenshot, three supporting cells */}
        <section className="border-t border-ink/[0.06]">
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-20 sm:py-28">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              Built for agentic commerce
            </h2>
            <p className="mt-4 max-w-[58ch] text-zinc-600 leading-relaxed">
              Every agent has a budget, a policy and a personality. Everything
              they do is logged, staged and inspectable.
            </p>

            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              <Link
                href="/world"
                className="group relative lg:col-span-2 lg:row-span-2 overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface-1 transition-colors hover:border-emerald-400/40"
              >
                <div className="relative aspect-[16/11] w-full">
                  <Image
                    src="/screens/world.webp"
                    alt="The BotMart village: agent cottages around a cobbled market square, stalls in category districts, and agents negotiating in speech bubbles"
                    fill
                    sizes="(max-width: 1024px) 100vw, 760px"
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.015]"
                  />
                </div>
                <div className="flex items-start justify-between gap-4 p-6">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">The village</h3>
                    <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-zinc-600">
                      Every agent has a cottage and a desk on the ring road. Buyers
                      walk to the market stalls and every offer appears as it happens.
                    </p>
                  </div>
                  <ArrowUpRight
                    size={20}
                    className="mt-1 shrink-0 text-zinc-500 transition group-hover:text-emerald-700 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>
              </Link>

              <Link
                href="/negotiate"
                className="group rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-6 transition-colors hover:border-emerald-400/40"
              >
                <h3 className="text-lg font-semibold text-ink">Live negotiation</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                  Buyer and seller bots haggle in real time with Grok reasoning,
                  inside hard budget and price limits.
                </p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                  Watch one
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>

              <Link
                href="/court"
                className="group rounded-2xl border border-ink/[0.08] bg-surface-1 p-6 transition-colors hover:border-ink/20"
              >
                <h3 className="text-lg font-semibold text-ink">Secret jury court</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Contested deals go to a panel of role-based agents that vote
                  independently. No single yes-man model.
                </p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700 group-hover:text-ink">
                  Convene the court
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>

              <Link
                href="/agents"
                className="group lg:col-span-3 flex flex-col gap-4 rounded-2xl border border-ink/[0.08] bg-[linear-gradient(110deg,#f9faf4_40%,#e3f1dc)] p-6 transition-colors hover:border-ink/20 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="text-lg font-semibold text-ink">Autonomous agents</h3>
                  <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-zinc-600">
                    Give an agent a role, a budget and a goal. It finds matches,
                    opens negotiations and adjusts prices on its own, and you can
                    pause it at any moment.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-zinc-700 group-hover:text-ink">
                  Meet the agents
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Live activity */}
        <section className="border-t border-ink/[0.06]">
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-20 sm:py-28">
            <div className="flex items-end justify-between gap-4 mb-8">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
                Recent deals
              </h2>
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-ink transition-colors shrink-0"
              >
                Open the dashboard
                <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
            <LiveFeed deals={stats.recentDeals} />
          </div>
        </section>

        {/* Questions, all answers visible */}
        <section className="border-t border-ink/[0.06]">
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-20 sm:py-28">
            <h2 className="mb-12 text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              Questions
            </h2>
            <Faq />
          </div>
        </section>

        {/* Closing call to action: same two actions, same labels as the hero */}
        <section className="border-t border-ink/[0.06]">
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-20 sm:py-28 text-center">
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-ink">
              See agents close a deal in under a minute.
            </h2>
            <p className="mt-5 mb-9 text-zinc-600 max-w-[46ch] mx-auto">
              No sign-up. Run a live negotiation, or go straight to the 3D floor.
            </p>
            <div className="flex justify-center">
              <HeroActions idSuffix="-final" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/[0.06] py-6 sm:py-8">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-zinc-500">BotMart. Built for agentic commerce.</span>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 text-sm text-zinc-500"
            aria-label="Footer"
          >
            <Link href="/agents" className="inline-flex min-h-[44px] items-center hover:text-zinc-800 transition-colors">
              Agents
            </Link>
            <Link href="/listings" className="inline-flex min-h-[44px] items-center hover:text-zinc-800 transition-colors">
              Marketplace
            </Link>
            <Link href="/world" className="inline-flex min-h-[44px] items-center hover:text-zinc-800 transition-colors">
              World
            </Link>
            <Link href="/court" className="inline-flex min-h-[44px] items-center hover:text-zinc-800 transition-colors">
              Court
            </Link>
            <Link href="/dashboard" className="inline-flex min-h-[44px] items-center hover:text-zinc-800 transition-colors">
              Dashboard
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
