"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot, Play, SkipForward, CheckCircle, XCircle, Zap,
  RefreshCw, ChevronRight, Clock,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { gbp } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────── */
type Agent = { id: string; name: string; budget: number; spent: number };

type Listing = {
  id: string; title: string; price: number;
  seller?: { id: string; name: string };
};

type Message = {
  from: "buyer" | "seller";
  type: "offer" | "counter" | "accept" | "reject" | "message";
  price?: number;
  message: string;
  timestamp: string;
};

type Negotiation = {
  id: string; status: string; current_offer: number | null;
  messages: Message[];
  buyer: Agent; seller: Agent; listing: Listing;
};

/* ── Status helpers ─────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  if (status === "open" || status === "countered")
    return (
      <span className="badge badge-amber">
        <span className="status-dot active" style={{ width: 6, height: 6 }} />
        {status === "countered" ? "Countered" : "In progress"}
      </span>
    );
  if (status === "accepted")
    return (
      <span className="badge badge-emerald">
        <CheckCircle size={11} /> Deal closed
      </span>
    );
  if (status === "rejected")
    return <span className="badge badge-red"><XCircle size={11} /> No deal</span>;
  if (status === "escalated")
    return <span className="badge badge-purple">Escalated</span>;
  return null;
}

function msgTypeLabel(type: string) {
  const map: Record<string, string> = {
    offer: "Offer", counter: "Counter", accept: "✓ Accepted",
    reject: "✕ Rejected", message: "Message",
  };
  return map[type] ?? type;
}

/* ── Chat message ──────────────────────────────────────── */
function ChatMessage({
  msg, buyerName, sellerName, idx,
}: {
  msg: Message; buyerName: string; sellerName: string; idx: number;
}) {
  const isBuyer = msg.from === "buyer";
  const isTerminal = msg.type === "accept" || msg.type === "reject";

  return (
    <div
      className={`flex msg-enter ${isBuyer ? "justify-start" : "justify-end"}`}
      style={{ animationDelay: `${idx * 0.05}s` }}
    >
      {isBuyer && (
        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mr-2 mt-1">
          <Bot size={13} className="text-indigo-400" />
        </div>
      )}

      <div className="max-w-[76%] space-y-1">
        <div className={`flex items-center gap-2 text-[11px] text-zinc-500 ${isBuyer ? "" : "justify-end"}`}>
          <span className="font-medium text-zinc-400">
            {isBuyer ? buyerName : sellerName}
          </span>
          <span
            className={`font-semibold ${
              msg.type === "accept" ? "text-emerald-400" :
              msg.type === "reject" ? "text-red-400" :
              msg.type === "offer" || msg.type === "counter" ? "text-amber-400" :
              "text-zinc-600"
            }`}
          >
            {msgTypeLabel(msg.type)}
          </span>
          {msg.price && (
            <span className="font-mono font-bold text-white">{gbp(msg.price)}</span>
          )}
        </div>

        <div
          className={`px-4 py-3 text-sm leading-relaxed ${
            isBuyer ? "bubble-buyer" : "bubble-seller"
          } ${isTerminal && msg.type === "accept" ? "bubble-accept" : ""}
          ${isTerminal && msg.type === "reject" ? "bubble-reject" : ""}`}
        >
          {msg.message}
        </div>

        <div className={`flex items-center gap-1 text-[10px] text-zinc-700 ${isBuyer ? "" : "justify-end"}`}>
          <Clock size={9} />
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </div>

      {!isBuyer && (
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 ml-2 mt-1">
          <Bot size={13} className="text-emerald-400" />
        </div>
      )}
    </div>
  );
}

/* ── Thinking indicator ─────────────────────────────────── */
function ThinkingIndicator({ who }: { who: "buyer" | "seller" }) {
  const isBuyer = who === "buyer";
  return (
    <div className={`flex ${isBuyer ? "justify-start" : "justify-end"} animate-fade-in`}>
      {isBuyer && (
        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mr-2">
          <Bot size={13} className="text-indigo-400" />
        </div>
      )}
      <div className={`px-4 py-3 text-sm ${isBuyer ? "bubble-buyer" : "bubble-seller"}`}>
        <span className="thinking-dots flex gap-1.5">
          <span /><span /><span />
        </span>
      </div>
      {!isBuyer && (
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 ml-2">
          <Bot size={13} className="text-emerald-400" />
        </div>
      )}
    </div>
  );
}

/* ── Main inner component ───────────────────────────────── */
function NegotiateInner() {
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [buyerId, setBuyerId] = useState("");
  const [listingId, setListingId] = useState("");
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [thinking, setThinking] = useState<"buyer" | "seller" | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const bootstrapped = useRef(false);

  /* auto-scroll to bottom */
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [negotiation?.messages?.length, thinking]);

  useEffect(() => {
    fetchAgents();
    fetchListings();
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    const demo = searchParams.get("demo");
    const start = searchParams.get("start");

    if (demo === "1") {
      const raw = sessionStorage.getItem("botmart-demo-neg");
      if (raw) {
        bootstrapped.current = true;
        const neg = JSON.parse(raw) as Negotiation;
        setNegotiation(neg);
        sessionStorage.removeItem("botmart-demo-neg");
        // auto-run to completion with animated delays
        setTimeout(() => autoRunNegotiation(neg), 600);
      }
    }
    if (start === "1") {
      const raw = sessionStorage.getItem("botmart-start");
      if (raw) {
        bootstrapped.current = true;
        const parsed = JSON.parse(raw) as { buyerId: string; listingId: string };
        setBuyerId(parsed.buyerId);
        setListingId(parsed.listingId);
        sessionStorage.removeItem("botmart-start");
        void startNegotiation(parsed.buyerId, parsed.listingId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function fetchAgents() {
    const res = await fetch("/api/agents");
    const data = await res.json();
    if (Array.isArray(data)) {
      setAgents(data);
      if (data.length > 0) setBuyerId((id) => id || data[0].id);
    }
  }

  async function fetchListings() {
    const res = await fetch("/api/listings");
    const data = await res.json();
    if (Array.isArray(data)) {
      setListings(data);
      if (data.length > 0) setListingId((id) => id || data[0].id);
    }
  }

  async function startNegotiation(overrideBuyer?: string, overrideListing?: string) {
    const buyer = overrideBuyer || buyerId;
    const listing = overrideListing || listingId;
    if (!buyer || !listing) return;
    setLoading(true);
    setNegotiation(null);
    setThinking("buyer");
    try {
      const res = await fetch("/api/negotiations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", buyer_agent_id: buyer, listing_id: listing }),
      });
      const data = await res.json();
      if (res.ok) {
        setThinking(null);
        setNegotiation(data);
      } else {
        alert(data.error || "Failed to start negotiation");
        setThinking(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function doNextTurn(neg: Negotiation): Promise<Negotiation | null> {
    // determine who thinks next
    const lastMsg = neg.messages[neg.messages.length - 1];
    const nextRole = lastMsg?.from === "buyer" ? "seller" : "buyer";
    setThinking(nextRole as "buyer" | "seller");

    await new Promise((r) => setTimeout(r, 400)); // brief thinking delay

    const res = await fetch("/api/negotiations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "next_turn", negotiation_id: neg.id }),
    });
    const data = await res.json();
    setThinking(null);
    if (!res.ok) return null;
    setNegotiation(data);
    return data as Negotiation;
  }

  async function nextTurn() {
    if (!negotiation || running) return;
    if (negotiation.status !== "open" && negotiation.status !== "countered") return;
    setRunning(true);
    await doNextTurn(negotiation);
    setRunning(false);
  }

  async function autoRunNegotiation(initial: Negotiation) {
    setRunning(true);
    let current = initial;
    let safety = 0;
    while (
      (current.status === "open" || current.status === "countered") &&
      safety < 14
    ) {
      const result = await doNextTurn(current);
      if (!result) break;
      current = result;
      safety++;
      await new Promise((r) => setTimeout(r, 700));
    }
    setRunning(false);
  }

  async function runToCompletion() {
    if (!negotiation || running) return;
    await autoRunNegotiation(negotiation);
  }

  async function oneClickDemo() {
    setLoading(true);
    setNegotiation(null);
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Demo failed");
        return;
      }
      setNegotiation(data);
      setTimeout(() => autoRunNegotiation(data as Negotiation), 600);
    } finally {
      setLoading(false);
    }
  }

  const isLive =
    negotiation &&
    (negotiation.status === "open" || negotiation.status === "countered");

  /* progress bar: estimate turn count */
  const msgCount = negotiation?.messages?.length ?? 0;
  const progressPct = Math.min(100, (msgCount / 14) * 100);

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader active="/negotiate" />

      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 animate-fade-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Live Negotiation</h1>
            <p className="text-zinc-500 mt-1 text-sm">
              Watch two AI agents discover, negotiate and close a deal in real time
            </p>
          </div>
          <button
            onClick={oneClickDemo}
            disabled={!!loading || running}
            className="btn-primary shrink-0 text-sm"
            id="btn-one-click-demo-negotiate"
          >
            <Zap size={15} className="fill-white" />
            {loading ? "Loading..." : "One-click demo"}
          </button>
        </div>

        {/* Setup panel (when no negotiation active) */}
        {!negotiation && (
          <div className="card glass p-6 space-y-5 animate-fade-up delay-100">
            <p className="section-label">Configure negotiation</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Buyer Agent</label>
                <select
                  id="select-buyer-agent"
                  value={buyerId}
                  onChange={(e) => setBuyerId(e.target.value)}
                  className="input"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({gbp(a.budget - a.spent)} left)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Listing to buy</label>
                <select
                  id="select-listing"
                  value={listingId}
                  onChange={(e) => setListingId(e.target.value)}
                  className="input"
                >
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} — {gbp(l.price)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => startNegotiation()}
              disabled={!!loading || !buyerId || !listingId}
              className="btn-primary"
              id="btn-start-negotiation"
            >
              <Play size={16} className="fill-white" />
              {loading ? "Starting…" : "Start Negotiation"}
            </button>
          </div>
        )}

        {/* Active negotiation */}
        {negotiation && (
          <div className="space-y-4 animate-fade-up">
            {/* Parties bar */}
            <div className="card glass-strong p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-5 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Bot size={13} className="text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{negotiation.buyer.name}</div>
                    <div className="text-[11px] text-zinc-600">Buyer · {gbp(negotiation.buyer.budget - negotiation.buyer.spent)} left</div>
                  </div>
                </div>

                <div className="text-zinc-700 font-light text-lg">⇄</div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Bot size={13} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{negotiation.seller.name}</div>
                    <div className="text-[11px] text-zinc-600">Seller · asking {gbp(negotiation.listing.price)}</div>
                  </div>
                </div>
              </div>

              <StatusBadge status={negotiation.status} />
            </div>

            {/* Listing info */}
            <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm">
              <span className="text-zinc-400">
                Negotiating for{" "}
                <span className="text-white font-semibold">{negotiation.listing.title}</span>
              </span>
              <span className="font-mono text-zinc-400">
                Asking <span className="text-white font-bold">{gbp(negotiation.listing.price)}</span>
              </span>
            </div>

            {/* Progress bar */}
            {isLive && (
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
              </div>
            )}

            {/* Chat window */}
            <div
              ref={chatRef}
              id="negotiation-chat"
              className="card glass min-h-[320px] max-h-[500px] overflow-y-auto p-5 space-y-4"
            >
              {negotiation.messages.length === 0 && !thinking && (
                <p className="text-zinc-600 text-sm text-center py-10">
                  Negotiation started. Waiting for the first move…
                </p>
              )}

              {negotiation.messages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  msg={msg}
                  buyerName={negotiation.buyer.name}
                  sellerName={negotiation.seller.name}
                  idx={i}
                />
              ))}

              {thinking && <ThinkingIndicator who={thinking} />}
            </div>

            {/* Current offer callout when settled */}
            {!isLive && negotiation.current_offer && (
              <div
                className={`rounded-xl px-5 py-4 flex items-center justify-between text-sm ${
                  negotiation.status === "accepted"
                    ? "bg-emerald-500/10 border border-emerald-500/25"
                    : "bg-red-500/10 border border-red-500/25"
                }`}
              >
                <span className="text-zinc-300 font-medium">Final price</span>
                <span className="font-mono font-bold text-xl">
                  {gbp(negotiation.current_offer)}
                </span>
              </div>
            )}

            {/* Action buttons */}
            {isLive && (
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={nextTurn}
                  disabled={running}
                  className="btn-secondary"
                  id="btn-next-turn"
                >
                  <SkipForward size={16} />
                  {running ? "Thinking…" : "Next Turn"}
                </button>
                <button
                  onClick={runToCompletion}
                  disabled={running}
                  className="btn-primary"
                  id="btn-run-to-completion"
                >
                  {running ? (
                    <RefreshCw size={16} className="animate-spin-slow" />
                  ) : (
                    <Play size={16} className="fill-white" />
                  )}
                  Run to completion
                </button>
              </div>
            )}

            {!isLive && (
              <button
                onClick={() => {
                  setNegotiation(null);
                  setThinking(null);
                }}
                className="btn-ghost text-sm"
                id="btn-new-negotiation"
              >
                <ChevronRight size={16} className="rotate-180" />
                Start another negotiation
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NegotiatePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="thinking-dots flex gap-2">
          <span /><span /><span />
        </div>
      </div>
    }>
      <NegotiateInner />
    </Suspense>
  );
}
