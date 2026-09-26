"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Play, SkipForward, CheckCircle, XCircle } from "lucide-react";

type Agent = {
  id: string;
  name: string;
  budget: number;
  spent: number;
};

type Listing = {
  id: string;
  title: string;
  price: number;
  seller?: { id: string; name: string };
};

type Message = {
  from: "buyer" | "seller";
  type: string;
  price?: number;
  message: string;
  timestamp: string;
};

type Negotiation = {
  id: string;
  status: string;
  current_offer: number | null;
  messages: Message[];
  buyer: Agent;
  seller: Agent;
  listing: Listing;
};

export default function NegotiatePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [buyerId, setBuyerId] = useState("");
  const [listingId, setListingId] = useState("");
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchListings();
  }, []);

  async function fetchAgents() {
    const res = await fetch("/api/agents");
    const data = await res.json();
    if (Array.isArray(data)) {
      setAgents(data);
      if (data.length > 0) setBuyerId(data[0].id);
    }
  }

  async function fetchListings() {
    const res = await fetch("/api/listings");
    const data = await res.json();
    if (Array.isArray(data)) {
      setListings(data);
      if (data.length > 0) setListingId(data[0].id);
    }
  }

  async function startNegotiation() {
    if (!buyerId || !listingId) return;
    setLoading(true);
    setNegotiation(null);

    try {
      const res = await fetch("/api/negotiations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          buyer_agent_id: buyerId,
          listing_id: listingId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNegotiation(data);
      } else {
        alert(data.error || "Failed to start negotiation");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function nextTurn() {
    if (!negotiation || negotiation.status !== "open") return;
    setRunning(true);

    try {
      const res = await fetch("/api/negotiations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "next_turn",
          negotiation_id: negotiation.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNegotiation(data);
      } else {
        alert(data.error || "Failed to run turn");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  }

  async function runToCompletion() {
    if (!negotiation) return;
    setRunning(true);

    let current = negotiation;
    let safety = 0;

    while (current.status === "open" && safety < 12) {
      const res = await fetch("/api/negotiations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "next_turn",
          negotiation_id: current.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) break;

      current = data;
      setNegotiation(data);
      safety++;

      // Small delay so the UI feels alive
      await new Promise((r) => setTimeout(r, 600));
    }

    setRunning(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-zinc-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Live Negotiation</h1>
            <p className="text-zinc-400 mt-1">
              Watch two agents discover, negotiate and close a deal
            </p>
          </div>
        </div>

        {/* Setup */}
        {!negotiation && (
          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-5 mb-8">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">
                  Buyer Agent
                </label>
                <select
                  value={buyerId}
                  onChange={(e) => setBuyerId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (£{a.budget - a.spent} left)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">
                  Listing to buy
                </label>
                <select
                  value={listingId}
                  onChange={(e) => setListingId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5"
                >
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} — £{l.price}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={startNegotiation}
              disabled={loading || !buyerId || !listingId}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-5 py-2.5 rounded-lg disabled:opacity-50"
            >
              <Play size={18} />
              {loading ? "Starting..." : "Start Negotiation"}
            </button>
          </div>
        )}

        {/* Active Negotiation */}
        {negotiation && (
          <div className="space-y-6">
            {/* Status bar */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Bot size={16} className="text-blue-400" />
                  <span className="font-medium">{negotiation.buyer.name}</span>
                  <span className="text-zinc-500">(Buyer)</span>
                </div>
                <span className="text-zinc-600">vs</span>
                <div className="flex items-center gap-2">
                  <Bot size={16} className="text-orange-400" />
                  <span className="font-medium">{negotiation.seller.name}</span>
                  <span className="text-zinc-500">(Seller)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {negotiation.status === "open" && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400">
                    In progress
                  </span>
                )}
                {negotiation.status === "accepted" && (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                    <CheckCircle size={14} /> Deal closed
                  </span>
                )}
                {negotiation.status === "rejected" && (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400">
                    <XCircle size={14} /> No deal
                  </span>
                )}
              </div>
            </div>

            {/* Listing info */}
            <div className="text-sm text-zinc-400">
              Negotiating for:{" "}
              <span className="text-white font-medium">
                {negotiation.listing.title}
              </span>{" "}
              (asking £{negotiation.listing.price})
            </div>

            {/* Messages */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {negotiation.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.from === "buyer" ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.from === "buyer"
                        ? "bg-blue-500/10 border border-blue-500/20"
                        : "bg-orange-500/10 border border-orange-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium opacity-70">
                        {msg.from === "buyer"
                          ? negotiation.buyer.name
                          : negotiation.seller.name}
                      </span>
                      <span className="text-xs opacity-40">{msg.type}</span>
                      {msg.price && (
                        <span className="text-xs font-bold">£{msg.price}</span>
                      )}
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            {negotiation.status === "open" && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={nextTurn}
                  disabled={running}
                  className="flex items-center gap-2 bg-white text-black font-medium px-5 py-2.5 rounded-lg hover:bg-zinc-200 disabled:opacity-50"
                >
                  <SkipForward size={18} />
                  {running ? "Thinking..." : "Next Turn"}
                </button>

                <button
                  onClick={runToCompletion}
                  disabled={running}
                  className="flex items-center gap-2 bg-emerald-500 text-black font-medium px-5 py-2.5 rounded-lg hover:bg-emerald-400 disabled:opacity-50"
                >
                  <Play size={18} />
                  Run to Completion
                </button>
              </div>
            )}

            {negotiation.status !== "open" && (
              <button
                onClick={() => setNegotiation(null)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ← Start another negotiation
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
