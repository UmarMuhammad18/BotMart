"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { WorldCanvas } from "@/components/world/WorldCanvas";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import type { WorldSnapshot } from "@/lib/types";
import { RefreshCw, Boxes, Activity } from "lucide-react";

export default function WorldPage() {
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastJson = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/world");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load world");
        return;
      }
      // Avoid re-rendering the 3D tree when nothing changed (stops Html/Text churn)
      const raw = JSON.stringify(data);
      if (raw !== lastJson.current) {
        lastJson.current = raw;
        setSnapshot(data);
      }
      setError(null);
    } catch {
      setError("Network error loading world");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader active="/world" />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="section-label mb-1">Live floor</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Boxes size={22} className="text-emerald-400" />
              3D Agent World
            </h1>
            <p className="text-sm text-zinc-500 mt-1 max-w-xl">
              Agents and stalls on an isometric marketplace. Drag to orbit, scroll
              to zoom.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="btn-secondary text-sm"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link href="/negotiate" className="btn-primary text-sm">
              <Activity size={14} />
              Negotiate
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
          <div className="min-h-[420px]">
            {snapshot ? (
              <WorldCanvas snapshot={snapshot} />
            ) : (
              <div className="w-full min-h-[420px] rounded-2xl border border-white/10 bg-zinc-950 flex items-center justify-center text-sm text-zinc-500">
                {loading ? "Loading world…" : "No world data yet — seed agents & listings."}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="card p-4">
              <h2 className="text-sm font-semibold mb-3">Floor stats</h2>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-black/30 border border-white/5 px-3 py-2">
                  <dt className="text-zinc-500">Agents</dt>
                  <dd className="text-lg font-bold">
                    {snapshot?.agents.length ?? "—"}
                  </dd>
                </div>
                <div className="rounded-lg bg-black/30 border border-white/5 px-3 py-2">
                  <dt className="text-zinc-500">Stalls</dt>
                  <dd className="text-lg font-bold">
                    {snapshot?.stalls.length ?? "—"}
                  </dd>
                </div>
                <div className="rounded-lg bg-black/30 border border-white/5 px-3 py-2 col-span-2">
                  <dt className="text-zinc-500">Open negotiations</dt>
                  <dd className="text-lg font-bold text-emerald-300">
                    {snapshot?.open_negotiations ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card p-4 max-h-56 overflow-y-auto">
              <h2 className="text-sm font-semibold mb-2">Agents on floor</h2>
              <ul className="space-y-1.5">
                {(snapshot?.agents || []).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between text-xs gap-2"
                  >
                    <span className="truncate">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1.5"
                        style={{
                          background: ROLE_BY_ID[a.role]?.hex || "#888",
                        }}
                      />
                      {a.name}
                    </span>
                    <span className="text-zinc-500 shrink-0">{a.activity}</span>
                  </li>
                ))}
                {!snapshot?.agents.length && (
                  <li className="text-zinc-500 text-xs">No agents yet — seed data.</li>
                )}
              </ul>
            </div>

            <div className="card p-4 max-h-48 overflow-y-auto">
              <h2 className="text-sm font-semibold mb-2">Recent events</h2>
              <ul className="space-y-2">
                {(snapshot?.events || []).map((e) => (
                  <li key={e.id} className="text-[11px] text-zinc-400 leading-snug">
                    <span className="text-zinc-600">
                      {new Date(e.at).toLocaleTimeString()}
                    </span>{" "}
                    {e.text}
                  </li>
                ))}
                {!snapshot?.events.length && (
                  <li className="text-zinc-500 text-xs">
                    Events appear as agents decide.
                  </li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
