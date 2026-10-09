"use client";

import { useState } from "react";
import { Gavel, Scale, Check, X, RefreshCw } from "lucide-react";
import type { CourtSession, JuryVote } from "@/lib/types";

function voteStyle(v: JuryVote) {
  if (v === "accept") return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
  if (v === "reject") return "text-rose-300 bg-rose-500/10 border-rose-500/30";
  return "text-amber-300 bg-amber-500/10 border-amber-500/30";
}

export function CourtPanel({
  negotiationId,
  onVerdict,
}: {
  negotiationId: string | null;
  onVerdict?: (session: CourtSession) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<CourtSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function convene() {
    if (!negotiationId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/court", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negotiation_id: negotiationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Court failed");
        return;
      }
      setSession(data);
      onVerdict?.(data);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label mb-1">Agentic court</p>
          <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
            <Gavel size={16} className="text-amber-300" />
            Secret jury ballots
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Five specialist agents vote independently. A judge aggregates the
            verdict — no yes-man single model.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-2 shrink-0"
          disabled={!negotiationId || busy}
          onClick={convene}
        >
          {busy ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Scale size={14} />
          )}
          {busy ? "Convening…" : "Convene court"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-rose-400 border border-rose-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!negotiationId && (
        <p className="text-xs text-zinc-500">
          Start or select a negotiation first, then convene the court.
        </p>
      )}

      {session && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 py-2">
              <div className="text-lg font-bold text-emerald-300">
                {session.accept_count}
              </div>
              <div className="text-[10px] text-zinc-500">Accept</div>
            </div>
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 py-2">
              <div className="text-lg font-bold text-rose-300">
                {session.reject_count}
              </div>
              <div className="text-[10px] text-zinc-500">Reject</div>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 py-2">
              <div className="text-lg font-bold text-amber-300">
                {session.counter_count}
              </div>
              <div className="text-[10px] text-zinc-500">Counter</div>
            </div>
          </div>

          <ul className="space-y-2">
            {session.ballots.map((b) => (
              <li
                key={b.role}
                className="rounded-xl border border-white/8 bg-black/30 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-zinc-200">
                    {b.name}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${voteStyle(b.vote)}`}
                  >
                    {b.vote === "accept" && <Check size={10} className="inline" />}
                    {b.vote === "reject" && <X size={10} className="inline" />}
                    {" "}
                    {b.vote}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {b.reason}
                </p>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-3">
            <p className="text-xs font-semibold text-amber-200 mb-1">
              Judge verdict: {session.judge_verdict}
              {session.recommended_price != null &&
                session.judge_verdict === "counter" &&
                ` · £${session.recommended_price}`}
            </p>
            <p className="text-[11px] text-zinc-400">{session.judge_reason}</p>
          </div>
        </div>
      )}
    </div>
  );
}
