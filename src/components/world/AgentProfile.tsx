"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brain, Link2, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { trustLabel } from "@/lib/agents/trust";

type Profile = {
  personality?: { label: string; blurb: string };
  memory: { text: string; at: string }[];
  recent: { id: string; status: string; price: number | null; at: string; side: string; title: string }[];
  trades_completed?: number;
};

/** The inspector's deeper view of an agent: personality, trust, memories, recent deals. */
export function AgentProfile({ agentId, reputation }: { agentId: string; reputation: number }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/agents/${agentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live) return;
        setProfile(d);
        setLoadedFor(agentId);
      })
      .catch(() => live && setLoadedFor(agentId));
    return () => {
      live = false;
    };
  }, [agentId]);

  const trust = trustLabel(reputation);
  const current = loadedFor === agentId ? profile : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${trust.className}`}>
          <ShieldCheck size={11} aria-hidden /> {trust.label} · {reputation}
        </span>
        {current?.personality && (
          <span className="rounded-full border border-ink/10 bg-ink/5 px-2 py-0.5 text-zinc-700" title={current.personality.blurb}>
            {current.personality.label}
          </span>
        )}
      </div>

      {current && current.memory.length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1 text-[10px] uppercase text-zinc-500">
            <Brain size={11} aria-hidden /> Remembers
          </p>
          <ul className="space-y-1">
            {current.memory.slice(0, 4).map((m, i) => (
              <li key={i} className="rounded-lg border border-ink/5 bg-paper/30 px-2 py-1.5 text-[11px] leading-snug text-zinc-700">
                {m.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {current && current.recent.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] uppercase text-zinc-500">Recent deals</p>
          <ul className="space-y-1">
            {current.recent.slice(0, 4).map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-[11px] text-zinc-700">
                <span className="min-w-0 flex-1 truncate">
                  {d.status === "accepted" ? `${d.side === "bought" ? "Bought" : "Sold"} ${d.title} · £${Math.round(Number(d.price))}` : d.status === "awaiting_approval" ? `Waiting on owner: ${d.title}` : `No deal: ${d.title}`}
                  <span className="text-zinc-500"> · {formatDistanceToNow(new Date(d.at), { addSuffix: true })}</span>
                </span>
                <Link href={`/world?replay=${d.id}`} className="shrink-0 text-emerald-700 hover:underline" title="Replay this deal" aria-label={`Replay ${d.title}`}>
                  <Link2 size={12} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
