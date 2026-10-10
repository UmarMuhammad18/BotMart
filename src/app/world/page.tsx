"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import {
  WorldCanvas,
  type CameraMode,
  type WorldSelection,
} from "@/components/world/WorldCanvas";
import { MiniMap } from "@/components/world/MiniMap";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import type { WorldSnapshot } from "@/lib/types";
import {
  RefreshCw,
  Boxes,
  Activity,
  Crosshair,
  Eye,
  Gavel,
  X,
} from "lucide-react";
import { gbp } from "@/lib/utils";

export default function WorldPage() {
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<WorldSelection>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>("overview");
  const lastJson = useRef("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/world");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load world");
        return;
      }
      // Normalize older API payloads
      const normalized: WorldSnapshot = {
        agents: data.agents || [],
        stalls: data.stalls || [],
        events: data.events || [],
        links: data.links || [],
        deal_popups: data.deal_popups || [],
        open_negotiations: data.open_negotiations ?? 0,
        live: data.live ?? true,
      };
      const raw = JSON.stringify(normalized);
      if (raw !== lastJson.current) {
        lastJson.current = raw;
        setSnapshot(normalized);
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
    const t = setInterval(() => void load(), 12000);
    return () => clearInterval(t);
  }, [load]);

  const selectedAgent =
    selection?.kind === "agent"
      ? snapshot?.agents.find((a) => a.id === selection.id)
      : null;
  const selectedStall =
    selection?.kind === "stall"
      ? snapshot?.stalls.find((s) => s.id === selection.id)
      : null;

  const followId =
    cameraMode === "follow"
      ? selectedAgent?.id ?? snapshot?.agents[0]?.id ?? null
      : null;

  function setMode(mode: CameraMode) {
    setCameraMode(mode);
    if (mode === "follow" && !selectedAgent && snapshot?.agents[0]) {
      setSelection({ kind: "agent", id: snapshot.agents[0].id });
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader active="/world" />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
          <div>
            <p className="section-label mb-1">Live floor</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Boxes size={22} className="text-emerald-400" />
              3D Agent World
            </h1>
            <p className="text-sm text-zinc-500 mt-1 max-w-xl">
              Click agents or stalls to inspect. Use camera presets or follow a
              bot. Amber lines = live negotiations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs">
              {(
                [
                  ["overview", "Overview", Crosshair],
                  ["follow", "Follow", Eye],
                  ["court", "Court", Gavel],
                ] as const
              ).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMode(mode)}
                  className={`px-3 py-2 inline-flex items-center gap-1.5 transition ${
                    cameraMode === mode
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
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

        <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
          <div className="min-h-[480px] relative">
            {snapshot ? (
              <WorldCanvas
                snapshot={snapshot}
                selection={selection}
                onSelect={setSelection}
                cameraMode={cameraMode}
                followAgentId={followId}
              />
            ) : (
              <div className="w-full min-h-[480px] rounded-2xl border border-white/10 bg-zinc-950 flex items-center justify-center text-sm text-zinc-500">
                {loading
                  ? "Loading world…"
                  : "No world data — seed agents & listings."}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            {/* Inspector */}
            <div className="card p-4 min-h-[140px]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Inspector</h2>
                {selection && (
                  <button
                    type="button"
                    className="text-zinc-500 hover:text-white"
                    onClick={() => setSelection(null)}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {!selection && (
                <p className="text-xs text-zinc-500">
                  Click an agent or stall on the floor (or mini-map).
                </p>
              )}

              {selectedAgent && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        background:
                          ROLE_BY_ID[selectedAgent.role]?.hex || "#888",
                      }}
                    />
                    <span className="font-semibold">{selectedAgent.name}</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {ROLE_BY_ID[selectedAgent.role]?.label || selectedAgent.role}{" "}
                    · {selectedAgent.activity} · rep {selectedAgent.reputation}
                  </p>
                  {selectedAgent.goal && (
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {selectedAgent.goal}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="rounded-lg bg-black/30 border border-white/5 px-2 py-1.5">
                      <div className="text-zinc-500">Budget</div>
                      <div className="font-mono font-semibold">
                        {gbp(selectedAgent.budget)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-black/30 border border-white/5 px-2 py-1.5">
                      <div className="text-zinc-500">Spent</div>
                      <div className="font-mono font-semibold">
                        {gbp(selectedAgent.spent)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      className="btn-secondary text-xs flex-1"
                      onClick={() => {
                        setSelection({ kind: "agent", id: selectedAgent.id });
                        setCameraMode("follow");
                      }}
                    >
                      <Eye size={12} /> Follow
                    </button>
                    <Link
                      href="/negotiate"
                      className="btn-primary text-xs flex-1 justify-center"
                    >
                      Negotiate
                    </Link>
                  </div>
                </div>
              )}

              {selectedStall && (
                <div className="space-y-2 text-sm">
                  <div className="font-semibold">{selectedStall.title}</div>
                  <p className="text-xs text-zinc-400">
                    {selectedStall.category || "general"} · stock{" "}
                    {selectedStall.stock} · {selectedStall.status}
                  </p>
                  <p className="text-lg font-mono font-bold text-emerald-300">
                    {gbp(selectedStall.price)}
                  </p>
                  {selectedStall.seller_name && (
                    <p className="text-xs text-zinc-500">
                      Seller: {selectedStall.seller_name}
                    </p>
                  )}
                  <Link
                    href="/negotiate"
                    className="btn-primary text-xs w-full justify-center mt-1"
                  >
                    Start negotiation
                  </Link>
                </div>
              )}
            </div>

            {snapshot && (
              <MiniMap
                snapshot={snapshot}
                selection={selection}
                onSelect={setSelection}
              />
            )}

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
                  <dd className="text-lg font-bold text-amber-300">
                    {snapshot?.open_negotiations ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card p-4 max-h-48 overflow-y-auto">
              <h2 className="text-sm font-semibold mb-2">Agents</h2>
              <ul className="space-y-1.5">
                {(snapshot?.agents || []).map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setSelection({ kind: "agent", id: a.id })}
                      className={`w-full flex items-center justify-between text-xs gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                        selection?.kind === "agent" && selection.id === a.id
                          ? "bg-white/10"
                          : "hover:bg-white/5"
                      }`}
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
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-4 max-h-40 overflow-y-auto">
              <h2 className="text-sm font-semibold mb-2">Events</h2>
              <ul className="space-y-2">
                {(snapshot?.events || []).map((e) => (
                  <li key={e.id} className="text-[11px] text-zinc-400 leading-snug">
                    <span className="text-zinc-600">
                      {new Date(e.at).toLocaleTimeString()}
                    </span>{" "}
                    {e.text}
                  </li>
                ))}
                {!snapshot?.events?.length && (
                  <li className="text-zinc-500 text-xs">No recent events.</li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
