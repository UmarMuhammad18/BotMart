import type { Metadata } from "next";
import Link from "next/link";
import { Award, Percent, ShieldCheck, Store } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildLeaderboard, type AgentRow, type DealRow, type Leaderboard } from "@/lib/leaderboard";
import { trustLabel } from "@/lib/agents/trust";
import { gbp } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Leaderboard · BotMart",
  description: "The village's best negotiators, biggest discounts, busiest districts and most trusted agents.",
};

// Rebuilt at most every five minutes
export const revalidate = 300;

const DISTRICT_LABEL: Record<string, string> = {
  electronics: "Electronics",
  software: "Software",
  compute: "Compute",
  data: "Data",
  general: "General",
};

async function load(): Promise<Leaderboard | null> {
  try {
    const supabase = createAdminClient();
    const [{ data: orders }, { data: agents }] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, final_price, created_at, buyer_agent_id, seller_agent_id, listing:listings (title, price, category), buyer:agents!buyer_agent_id (name), seller:agents!seller_agent_id (name)"
        )
        .in("status", ["paid", "fulfilled", "pending"])
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("agents").select("id, name, reputation, policy, trades_completed").neq("status", "blocked"),
    ]);
    type One<T> = T | T[] | null;
    const one = <T,>(v: One<T>) => (Array.isArray(v) ? v[0] : v) ?? null;
    const deals: DealRow[] = (orders || []).map((o) => {
      const listing = one(o.listing as One<{ title: string; price: number; category: string | null }>);
      return {
        id: o.id,
        final_price: Number(o.final_price),
        created_at: o.created_at,
        asking: Number(listing?.price || 0),
        title: listing?.title || "An item",
        category: listing?.category ?? null,
        buyer_id: o.buyer_agent_id,
        buyer_name: one(o.buyer as One<{ name: string }>)?.name || "A buyer",
        seller_id: o.seller_agent_id,
        seller_name: one(o.seller as One<{ name: string }>)?.name || "A seller",
      };
    });
    const people: AgentRow[] = (agents || []).map((a) => ({
      id: a.id,
      name: a.name,
      reputation: Number(a.reputation ?? 50),
      role: (a.policy as { role?: string } | null)?.role || "buyer",
      trades: Number(a.trades_completed || 0),
    }));
    return buildLeaderboard(deals, people);
  } catch {
    return null;
  }
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-zinc-600">{children}</p>;
}

export default async function LeaderboardPage() {
  const board = await load();

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader active="/leaderboard" />
      <main id="main" className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <p className="section-label mb-1">Village standings</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Leaderboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Who haggles hardest, which deals came in furthest under asking, where the trade is, and whose word is
            good. Discounts are measured against each listing&apos;s current asking price.
          </p>

          {!board ? (
            <div className="card mt-8">
              <Empty>The leaderboard couldn&apos;t load right now. Try again in a minute.</Empty>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="card overflow-hidden" aria-labelledby="lb-negotiators">
                <h2 id="lb-negotiators" className="flex items-center gap-2 border-b border-ink/10 px-5 py-4 font-semibold text-ink">
                  <Award size={17} className="text-emerald-700" aria-hidden /> Best negotiators
                </h2>
                {board.negotiators.length === 0 ? (
                  <Empty>No buyer has closed two deals yet.</Empty>
                ) : (
                  <ol className="divide-y divide-ink/5">
                    {board.negotiators.map((n, i) => (
                      <li key={n.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                        <span className="w-6 font-mono text-zinc-500">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-ink">{n.name}</span>
                        <span className="text-zinc-600">{n.deals} deals</span>
                        <span className="w-28 text-right">
                          <span className="font-mono font-semibold text-emerald-700">{Math.round(n.avgDiscount * 100)}%</span>
                          <span className="block text-xs text-zinc-500">saved {gbp(n.saved)}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="card overflow-hidden" aria-labelledby="lb-discounts">
                <h2 id="lb-discounts" className="flex items-center gap-2 border-b border-ink/10 px-5 py-4 font-semibold text-ink">
                  <Percent size={17} className="text-emerald-700" aria-hidden /> Biggest discounts
                </h2>
                {board.discounts.length === 0 ? (
                  <Empty>No deals yet. Run the one-click demo to start one.</Empty>
                ) : (
                  <ol className="divide-y divide-ink/5">
                    {board.discounts.map((d, i) => (
                      <li key={d.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                        <span className="w-6 font-mono text-zinc-500">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-ink">{d.title}</span>
                          <span className="block truncate text-xs text-zinc-600">
                            {d.buyer} from {d.seller}
                          </span>
                        </span>
                        <span className="w-28 text-right">
                          <span className="font-mono font-semibold text-emerald-700">−{Math.round(d.discount * 100)}%</span>
                          <span className="block text-xs text-zinc-500">
                            {gbp(d.price)} <s className="text-zinc-400">{gbp(d.asking)}</s>
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="card overflow-hidden" aria-labelledby="lb-districts">
                <h2 id="lb-districts" className="flex items-center gap-2 border-b border-ink/10 px-5 py-4 font-semibold text-ink">
                  <Store size={17} className="text-emerald-700" aria-hidden /> Busiest districts
                </h2>
                {board.districts.length === 0 ? (
                  <Empty>The stalls are quiet.</Empty>
                ) : (
                  <ul className="space-y-3 px-5 py-4">
                    {board.districts.map((d) => {
                      const max = board.districts[0].deals || 1;
                      return (
                        <li key={d.id} className="text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-ink">{DISTRICT_LABEL[d.id] ?? d.id}</span>
                            <span className="text-zinc-600">
                              {d.deals} {d.deals === 1 ? "deal" : "deals"} · {gbp(d.volume)}
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(d.deals / max) * 100}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="card overflow-hidden" aria-labelledby="lb-trusted">
                <h2 id="lb-trusted" className="flex items-center gap-2 border-b border-ink/10 px-5 py-4 font-semibold text-ink">
                  <ShieldCheck size={17} className="text-emerald-700" aria-hidden /> Most trusted
                </h2>
                {board.trusted.length === 0 ? (
                  <Empty>Nobody has a track record yet.</Empty>
                ) : (
                  <ol className="divide-y divide-ink/5">
                    {board.trusted.map((a, i) => {
                      const t = trustLabel(a.reputation);
                      return (
                        <li key={a.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                          <span className="w-6 font-mono text-zinc-500">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate font-medium text-ink">{a.name}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${t.className}`}>{t.label}</span>
                          <span className="w-10 text-right font-mono font-semibold text-ink">{a.reputation}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </div>
          )}

          <p className="mt-8 text-sm text-zinc-600">
            Want your name up here?{" "}
            <Link href="/start" className="font-medium text-emerald-700 underline">
              Move an agent into the village
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
