"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { gbp } from "@/lib/utils";
import { Agent } from "@/lib/types";
import {
  Bot, CheckCircle, XCircle, AlertCircle, Package,
  RotateCcw, Pause, Skull, RefreshCw, Zap, TrendingUp,
} from "lucide-react";

type NegotiationRow = {
  id: string; status: string; current_offer: number | null;
  messages: { from: string; message: string; type: string; price?: number }[];
  updated_at: string;
  buyer: { id: string; name: string; status: string };
  seller: { id: string; name: string; status: string };
  listing: { id: string; title: string; price: number };
};

type OrderRow = {
  id: string; status: string; final_price: number; created_at: string;
  stripe_payment_intent_id?: string | null;
  buyer: { name: string }; seller: { name: string }; listing: { title: string };
};

function NegStatusBadge({ status }: { status: string }) {
  if (status === "open" || status === "countered")
    return (
      <span className="badge badge-amber">
        <span className="status-dot active" style={{ width: 5, height: 5 }} />
        {status}
      </span>
    );
  if (status === "accepted") return <span className="badge badge-emerald"><CheckCircle size={10} /> accepted</span>;
  if (status === "rejected") return <span className="badge badge-red"><XCircle size={10} /> rejected</span>;
  if (status === "escalated") return <span className="badge badge-purple"><AlertCircle size={10} /> escalated</span>;
  return <span className="badge badge-zinc">{status}</span>;
}

function OrderStatusBadge({ status }: { status: string }) {
  if (status === "paid") return <span className="badge badge-blue">paid</span>;
  if (status === "fulfilled") return <span className="badge badge-emerald"><CheckCircle size={10} /> fulfilled</span>;
  if (status === "cancelled") return <span className="badge badge-red">cancelled</span>;
  return <span className="badge badge-zinc">{status}</span>;
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [negotiations, setNegotiations] = useState<NegotiationRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!silent) setRefreshing(true);
    const [a, n, o] = await Promise.all([
      fetch("/api/agents").then((r) => r.json()),
      fetch("/api/negotiations").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
    ]);
    setAgents(Array.isArray(a) ? a : []);
    setNegotiations(Array.isArray(n) ? n : []);
    setOrders(Array.isArray(o) ? o : []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 5000);
    return () => clearInterval(t);
  }, []);

  async function setAgentStatus(id: string, status: string) {
    await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load(true);
  }

  async function fulfill(id: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "fulfilled" }),
    });
    load(true);
  }

  const live = negotiations.filter((n) => n.status === "open" || n.status === "countered");
  const closed = negotiations.filter(
    (n) => n.status === "accepted" || n.status === "rejected" || n.status === "escalated"
  );
  const totalVolume = orders
    .filter((o) => o.status === "paid" || o.status === "fulfilled")
    .reduce((s, o) => s + Number(o.final_price ?? 0), 0);
  const activeAgents = agents.filter((a) => a.status === "active").length;

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader active="/dashboard" />
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 space-y-10">

        {/* Header */}
        <div className="flex items-start justify-between animate-fade-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Human Dashboard</h1>
            <p className="text-zinc-500 mt-1 text-sm">
              Monitor agents, watch live deals, and fulfil orders. Refreshes every 5s.
            </p>
          </div>
          <button
            onClick={() => load()}
            disabled={refreshing}
            className="btn-ghost text-sm"
            id="btn-refresh-dashboard"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin-slow" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-up delay-100">
              <div className="stat-card">
                <div className="stat-value gradient-text">{agents.length}</div>
                <div className="stat-label flex items-center gap-1"><Bot size={11} /> Total agents</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-amber-400">{live.length}</div>
                <div className="stat-label flex items-center gap-1">
                  <span className="status-dot active" style={{ width: 7, height: 7 }} />
                  Live negotiations
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-indigo-400">{orders.length}</div>
                <div className="stat-label flex items-center gap-1"><Package size={11} /> Orders</div>
              </div>
              <div className="stat-card">
                <div className="stat-value gradient-text">{gbp(totalVolume)}</div>
                <div className="stat-label flex items-center gap-1"><TrendingUp size={11} /> Volume settled</div>
              </div>
            </div>

            {/* Agents section */}
            <section className="animate-fade-up delay-150">
              <p className="section-label">
                Agents
                <span className="ml-2 badge badge-emerald">{activeAgents} active</span>
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="card p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background:
                            agent.status === "active"
                              ? "rgba(16,185,129,0.12)"
                              : agent.status === "paused"
                              ? "rgba(245,158,11,0.12)"
                              : "rgba(239,68,68,0.12)",
                        }}
                      >
                        <Bot
                          size={16}
                          className={
                            agent.status === "active"
                              ? "text-emerald-400"
                              : agent.status === "paused"
                              ? "text-amber-400"
                              : "text-red-400"
                          }
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {agent.name}
                          <span
                            className={`status-dot ${agent.status}`}
                            title={agent.status}
                          />
                        </div>
                        <div className="text-xs text-zinc-500 truncate">
                          {gbp(agent.budget)} budget · spent {gbp(agent.spent)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {agent.status !== "active" && (
                        <button
                          onClick={() => setAgentStatus(agent.id, "active")}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1 transition"
                          id={`btn-resume-${agent.id}`}
                        >
                          <RotateCcw size={11} /> Resume
                        </button>
                      )}
                      {agent.status !== "paused" && (
                        <button
                          onClick={() => setAgentStatus(agent.id, "paused")}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 flex items-center gap-1 transition"
                          id={`btn-pause-${agent.id}`}
                        >
                          <Pause size={11} /> Pause
                        </button>
                      )}
                      <button
                        onClick={() => setAgentStatus(agent.id, "blocked")}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center gap-1 transition"
                        id={`btn-kill-${agent.id}`}
                      >
                        <Skull size={11} /> Kill
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Live negotiations */}
            <section className="animate-fade-up delay-200">
              <p className="section-label">
                Active negotiations
                {live.length > 0 && (
                  <span className="ml-2 badge badge-amber">
                    <span className="status-dot active" style={{ width: 5, height: 5 }} />
                    {live.length}
                  </span>
                )}
              </p>
              {live.length === 0 ? (
                <div className="card p-8 text-center text-zinc-600 text-sm">
                  No active negotiations. Start one from the{" "}
                  <a href="/negotiate" className="text-emerald-400 hover:underline">Negotiate</a> page.
                </div>
              ) : (
                <div className="space-y-3">
                  {live.map((n) => (
                    <div key={n.id} className="card p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
                        <span className="font-medium">
                          {n.buyer.name}
                          <span className="text-zinc-600 mx-1.5">vs</span>
                          {n.seller.name}
                          <span className="text-zinc-600 mx-1.5">·</span>
                          <span className="text-zinc-300">{n.listing.title}</span>
                        </span>
                        <NegStatusBadge status={n.status} />
                      </div>
                      {/* Last few messages preview */}
                      <div className="space-y-1.5">
                        {(n.messages || []).slice(-3).map((m, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span
                              className={`font-semibold shrink-0 ${
                                m.from === "buyer" ? "text-indigo-400" : "text-emerald-400"
                              }`}
                            >
                              {m.from}
                            </span>
                            <span className="text-zinc-500 line-clamp-1">{m.message}</span>
                            {m.price && (
                              <span className="shrink-0 font-mono text-zinc-300">{gbp(m.price)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Closed negotiations */}
            {closed.length > 0 && (
              <section className="animate-fade-up delay-250">
                <p className="section-label">Closed deals</p>
                <div className="space-y-2">
                  {closed.map((n) => (
                    <div
                      key={n.id}
                      className="card px-4 py-3 flex items-center justify-between gap-4 text-sm"
                    >
                      <span className="text-zinc-300 truncate">
                        {n.listing.title}
                        <span className="text-zinc-600 mx-1.5">·</span>
                        {n.buyer.name} / {n.seller.name}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        {n.current_offer && (
                          <span className="font-mono text-zinc-300">{gbp(n.current_offer)}</span>
                        )}
                        <NegStatusBadge status={n.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Orders */}
            <section className="animate-fade-up delay-300">
              <p className="section-label">Orders / Fulfilment</p>
              {orders.length === 0 ? (
                <div className="card p-8 text-center text-zinc-600 text-sm">
                  No orders yet. Complete a negotiation to generate one.
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="card px-4 py-3 flex items-center justify-between gap-4 flex-wrap"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {order.listing?.title}
                          <span className="text-zinc-600 mx-1.5">·</span>
                          <span className="font-mono text-emerald-400">{gbp(order.final_price)}</span>
                        </div>
                        <div className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1.5">
                          {order.buyer?.name} → {order.seller?.name}
                          {order.stripe_payment_intent_id && (
                            <>
                              <span>·</span>
                              <Zap size={10} className="text-indigo-400" />
                              <span className="font-mono text-indigo-400 truncate max-w-[120px]">
                                {order.stripe_payment_intent_id}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <OrderStatusBadge status={order.status} />
                        {order.status !== "fulfilled" && order.status !== "cancelled" && (
                          <button
                            onClick={() => fulfill(order.id)}
                            className="btn-primary text-xs px-3 py-1.5 rounded-lg"
                            id={`btn-fulfill-${order.id}`}
                          >
                            <CheckCircle size={12} />
                            Mark fulfilled
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
