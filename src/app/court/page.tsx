"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CourtPanel } from "@/components/court/CourtPanel";
import { Gavel } from "lucide-react";

type NegRow = {
  id: string;
  status: string;
  current_offer: number | null;
  listing?: { title?: string; price?: number } | null;
  buyer?: { name?: string } | null;
  seller?: { name?: string } | null;
};

export default function CourtPage() {
  const [negs, setNegs] = useState<NegRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/negotiations");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.negotiations || [];
        setNegs(list);
        if (list[0]?.id) setSelected(list[0].id);
      } catch {
        setNegs([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader active="/court" />

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex-1">
        <div className="mb-8">
          <p className="section-label mb-1">Multi-agent review</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gavel size={22} className="text-amber-300" />
            Courtroom
          </h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-2xl">
            Inspired by multi-Claude juries: specialist agents cast secret
            ballots on a live deal. No single yes-man model decides alone.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-semibold">Open negotiations</h2>
            {loading && (
              <p className="text-xs text-zinc-500">Loading…</p>
            )}
            {!loading && negs.length === 0 && (
              <div className="card p-4 text-xs text-zinc-500">
                No negotiations yet.{" "}
                <Link href="/negotiate" className="text-emerald-400 underline">
                  Start one
                </Link>
                .
              </div>
            )}
            <ul className="space-y-2">
              {negs.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(n.id)}
                    className={`w-full text-left rounded-xl border px-3 py-3 transition ${
                      selected === n.id
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-white/8 bg-black/30 hover:border-white/15"
                    }`}
                  >
                    <div className="text-sm font-medium truncate">
                      {n.listing?.title || "Listing"}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {n.buyer?.name || "Buyer"} ↔ {n.seller?.name || "Seller"} ·{" "}
                      {n.status}
                      {n.current_offer != null && ` · £${n.current_offer}`}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <CourtPanel negotiationId={selected} />
          </div>
        </div>
      </div>
    </main>
  );
}
