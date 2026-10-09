"use client";

import { Agent } from "@/lib/types";
import {
  Bot,
  Wallet,
  TrendingUp,
  Shield,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { gbp } from "@/lib/utils";

type RunResult = {
  agent: { id: string; name: string; goal: string | null };
  matches: { id: string; title: string; price: number; score: number }[];
  negotiations_started: string[];
  negotiations_completed: {
    id: string;
    status: string;
    final_price?: number;
    listing?: string;
  }[];
  skipped_reason?: string;
};

export function AgentCard({
  agent,
  onRun,
  running,
  lastResult,
  signedIn,
}: {
  agent: Agent;
  onRun: (id: string) => void;
  running: boolean;
  lastResult?: RunResult | null;
  signedIn: boolean;
}) {
  const spent = Number(agent.spent ?? 0);
  const budget = Number(agent.budget ?? 0);
  const usedPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const rep = Number(agent.reputation ?? 50);
  const completed = Number(agent.trades_completed ?? 0);
  const failed = Number(agent.trades_failed ?? 0);
  const isMine =
    signedIn && agent.owner_id && agent.owner_id !== "hackathon-user";

  return (
    <div className="card card-interactive p-5 animate-fade-up group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="agent-avatar bg-gradient-to-br from-zinc-800 to-zinc-900"
            style={{
              background:
                agent.status === "active"
                  ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))"
                  : agent.status === "paused"
                    ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,179,8,0.1))"
                    : "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))",
            }}
          >
            <Bot
              size={18}
              className={
                agent.status === "active"
                  ? "text-emerald-400"
                  : agent.status === "paused"
                    ? "text-amber-400"
                    : "text-red-400"
              }
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              {agent.name}
              {isMine && (
                <span className="badge badge-blue text-[9px]">yours</span>
              )}
            </h3>
            <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
              {agent.goal || agent.description || "No goal set"}
            </p>
          </div>
        </div>
        <span
          className={`badge shrink-0 ${
            agent.status === "active"
              ? "badge-emerald"
              : agent.status === "paused"
                ? "badge-amber"
                : "badge-red"
          }`}
        >
          <span
            className={`status-dot ${agent.status}`}
            style={{ width: 5, height: 5 }}
          />
          {agent.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Wallet size={11} />
            Budget
          </span>
          <span className="font-mono">
            <span className="text-zinc-300 font-semibold">{gbp(spent)}</span> /{" "}
            {gbp(budget)}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${usedPct}%`,
              background:
                usedPct > 80
                  ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                  : "linear-gradient(90deg, #10b981, #06b6d4)",
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {agent.policy?.role && (
          <span className="badge badge-emerald text-[10px]">{agent.policy.role}</span>
        )}
        {agent.policy?.categories?.map((c) => (
          <span key={c} className="badge badge-zinc text-[10px]">
            {c}
          </span>
        ))}
        {agent.policy?.max_price != null && (
          <span className="badge badge-blue text-[10px]">
            max {gbp(agent.policy.max_price)}
          </span>
        )}
        {agent.policy?.style && (
          <span className="badge badge-purple text-[10px]">{agent.policy.style}</span>
        )}
      </div>

      <div className="flex items-center flex-wrap gap-3 text-xs text-zinc-500 pt-3 border-t border-white/[0.06] mb-3">
        <span className="flex items-center gap-1" title="Reputation 0–100">
          <TrendingUp size={11} />
          Rep <span className="text-zinc-300 font-medium ml-0.5">{rep}</span>
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 size={11} className="text-emerald-500/70" />
          <span className="text-zinc-300 font-medium">{completed}</span> won
        </span>
        <span className="flex items-center gap-1">
          <XCircle size={11} className="text-red-500/70" />
          <span className="text-zinc-300 font-medium">{failed}</span> lost
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Shield size={11} />
          {gbp(budget - spent)} left
        </span>
      </div>

      <button
        onClick={() => onRun(agent.id)}
        disabled={running || agent.status !== "active"}
        className="w-full btn-primary text-xs py-2 rounded-lg disabled:opacity-40"
        id={`btn-run-${agent.id}`}
      >
        {running ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            Running…
          </>
        ) : (
          <>
            <Play size={13} />
            Run agent (auto-shop)
          </>
        )}
      </button>

      {lastResult && lastResult.agent.id === agent.id && (
        <div className="mt-3 p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs space-y-1.5">
          {lastResult.skipped_reason ? (
            <p className="text-amber-400">{lastResult.skipped_reason}</p>
          ) : (
            <>
              <p className="text-zinc-400">
                Matched {lastResult.matches.length} listing
                {lastResult.matches.length !== 1 ? "s" : ""} · started{" "}
                {lastResult.negotiations_started.length}
              </p>
              {lastResult.negotiations_completed.map((n) => (
                <div key={n.id} className="flex justify-between text-zinc-300">
                  <span className="truncate">{n.listing || n.id.slice(0, 8)}</span>
                  <span
                    className={
                      n.status === "accepted"
                        ? "text-emerald-400"
                        : n.status === "rejected"
                          ? "text-red-400"
                          : "text-zinc-500"
                    }
                  >
                    {n.status}
                    {n.final_price != null ? ` · ${gbp(n.final_price)}` : ""}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
