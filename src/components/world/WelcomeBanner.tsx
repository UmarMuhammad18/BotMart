"use client";

import Link from "next/link";
import { useState } from "react";
import { PartyPopper, ShoppingBasket } from "lucide-react";
import type { WorldAgent } from "@/lib/types";

/** Shown after onboarding while the new agent's cottage goes up. */
export function WelcomeBanner({ agent, onRan }: { agent: WorldAgent | null; onRan: () => void }) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  if (!agent) {
    return (
      <div className="mb-4 rounded-xl border border-emerald-600/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900">
        Laying the foundations… your agent will appear in a moment.
      </div>
    );
  }

  const shops = agent.role === "buyer" || agent.role === "negotiator" || agent.role === "scout";

  async function goShopping() {
    if (!agent) return;
    setState("running");
    setMessage(null);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agent.id, max_negotiations: 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMessage(data.error || "It couldn't head out just now.");
        return;
      }
      setState("done");
      setMessage(
        data.skipped_reason
          ? `${agent.name} looked around but didn't find anything: ${data.skipped_reason}`
          : `${agent.name} is off to the stalls. Watch the square.`
      );
      onRan();
    } catch {
      setState("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-600/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900">
      <PartyPopper size={18} className="shrink-0 text-emerald-700" aria-hidden />
      <p className="min-w-0 flex-1" aria-live="polite">
        {message ?? (
          <>
            Welcome to the village, <strong>{agent.name}</strong>. Its cottage is going up on the green.
          </>
        )}
      </p>
      {shops && state !== "done" && (
        <button type="button" onClick={() => void goShopping()} disabled={state === "running"} className="btn-primary text-xs">
          <ShoppingBasket size={13} aria-hidden /> {state === "running" ? "Heading out…" : "Send it shopping"}
        </button>
      )}
      {!shops && (
        <Link href="/listings" className="btn-secondary text-xs">
          See its stall
        </Link>
      )}
      <button type="button" onClick={() => setHidden(true)} className="text-xs text-emerald-800 underline">
        Dismiss
      </button>
    </div>
  );
}
