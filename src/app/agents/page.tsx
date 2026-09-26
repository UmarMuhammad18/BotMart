"use client";

import { useEffect, useState } from "react";
import { Agent } from "@/lib/types";
import { Plus, Bot, Wallet, Zap, ChevronDown, ChevronUp, TrendingUp, Shield } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { gbp } from "@/lib/utils";

function AgentCard({ agent }: { agent: Agent }) {
  const spent = Number(agent.spent ?? 0);
  const budget = Number(agent.budget ?? 0);
  const usedPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

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
            <h3 className="font-semibold text-sm">{agent.name}</h3>
            <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
              {agent.description || "No description"}
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

      {/* Budget bar */}
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
            style={{ width: `${usedPct}%`,
              background: usedPct > 80
                ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                : "linear-gradient(90deg, #10b981, #06b6d4)",
            }}
          />
        </div>
      </div>

      {/* Policy tags */}
      {agent.policy?.categories?.length ? (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {agent.policy.categories.map((c) => (
            <span key={c} className="badge badge-zinc text-[10px]">
              {c}
            </span>
          ))}
          {agent.policy.max_price && (
            <span className="badge badge-blue text-[10px]">
              max {gbp(agent.policy.max_price)}
            </span>
          )}
          {agent.policy.style && (
            <span className="badge badge-purple text-[10px]">
              {agent.policy.style}
            </span>
          )}
        </div>
      ) : null}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-zinc-500 pt-3 border-t border-white/[0.06]">
        <span className="flex items-center gap-1">
          <TrendingUp size={11} />
          Rep: <span className="text-zinc-300 font-medium ml-0.5">{agent.reputation ?? 50}</span>
        </span>
        <span className="flex items-center gap-1">
          <Shield size={11} />
          {gbp(budget - spent)} remaining
        </span>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState(1000);
  const [maxPrice, setMaxPrice] = useState(100);
  const [categories, setCategories] = useState("electronics");
  const [style, setStyle] = useState("thrifty");
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchAgents(); }, []);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function createAgent(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, description, budget,
          policy: {
            max_price: maxPrice,
            categories: categories.split(",").map((c) => c.trim()).filter(Boolean),
            style,
          },
        }),
      });
      if (res.ok) {
        setName(""); setDescription(""); setBudget(1000); setShowForm(false);
        fetchAgents();
      }
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  }

  const active = agents.filter((a) => a.status === "active").length;
  const totalBudget = agents.reduce((s, a) => s + Number(a.budget ?? 0), 0);

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader active="/agents" />
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">

        {/* Page header */}
        <div className="flex items-start justify-between mb-10 animate-fade-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
            <p className="text-zinc-500 mt-1 text-sm">Create and manage autonomous commerce agents</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-secondary shrink-0 text-sm"
            id="btn-new-agent"
          >
            {showForm ? <ChevronUp size={16} /> : <Plus size={16} />}
            {showForm ? "Close" : "New Agent"}
          </button>
        </div>

        {/* Stats row */}
        {agents.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-up delay-100">
            <div className="stat-card">
              <div className="stat-value gradient-text">{agents.length}</div>
              <div className="stat-label">Total agents</div>
            </div>
            <div className="stat-card">
              <div className="stat-value gradient-text">{active}</div>
              <div className="stat-label">Active now</div>
            </div>
            <div className="stat-card">
              <div className="stat-value gradient-text">{gbp(totalBudget)}</div>
              <div className="stat-label">Total capital</div>
            </div>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form
            onSubmit={createAgent}
            className="card glass p-6 mb-8 space-y-5 animate-fade-up"
          >
            <p className="section-label">New agent</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Name</label>
                <input id="input-agent-name" value={name} onChange={(e) => setName(e.target.value)}
                  required placeholder="e.g. BargainBot" className="input" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Description</label>
                <input id="input-agent-desc" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this agent's goal?" className="input" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Budget (£)</label>
                <input id="input-agent-budget" type="number" value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Max price (£)</label>
                <input id="input-agent-maxprice" type="number" value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Style</label>
                <input id="input-agent-style" value={style} onChange={(e) => setStyle(e.target.value)}
                  placeholder="thrifty" className="input" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-2 font-medium">Categories (comma separated)</label>
              <input id="input-agent-categories" value={categories} onChange={(e) => setCategories(e.target.value)}
                placeholder="electronics, software" className="input" />
            </div>
            <div className="flex gap-3 pt-1">
              <button id="btn-create-agent" type="submit" disabled={creating} className="btn-primary text-sm">
                <Zap size={14} />
                {creating ? "Creating…" : "Create Agent"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Agent grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-48 rounded-2xl" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-24 gap-4 border-dashed animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
              <Bot size={28} className="text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="font-medium text-zinc-300">No agents yet</p>
              <p className="text-sm text-zinc-500 mt-1">Create your first agent or seed demo data</p>
            </div>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
              <Plus size={15} /> Create agent
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {agents.map((agent, i) => (
              <div key={agent.id} style={{ animationDelay: `${i * 0.07}s` }}>
                <AgentCard agent={agent} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
