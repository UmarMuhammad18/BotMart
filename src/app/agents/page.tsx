"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Agent } from "@/lib/types";
import { Plus, Bot, ChevronUp, Loader2, UserPlus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentCreateForm } from "@/components/agents/AgentCreateForm";
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

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<Record<string, RunResult>>({});
  const [signedIn, setSignedIn] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setSignedIn(!!d.user))
      .catch(() => setSignedIn(false));
  }, []);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function runAgent(id: string) {
    setRunningId(id);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: id,
          max_negotiations: 2,
          auto_complete: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRunResults((prev) => ({ ...prev, [id]: data }));
        fetchAgents();
      } else {
        alert(data.error || "Failed to run agent");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to run agent");
    } finally {
      setRunningId(null);
    }
  }

  async function claimAll() {
    setClaiming(true);
    try {
      const res = await fetch("/api/agents/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Claimed ${data.claimed} agent(s)`);
        fetchAgents();
      } else {
        alert(data.error || "Claim failed — sign in first");
      }
    } catch {
      alert("Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  const active = agents.filter((a) => a.status === "active").length;
  const totalBudget = agents.reduce((s, a) => s + Number(a.budget ?? 0), 0);

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader active="/agents" />
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="flex items-start justify-between mb-10 animate-fade-up gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
            <p className="text-zinc-500 mt-1 text-sm">
              Create agents, set roles and goals, and let them shop autonomously
            </p>
          </div>
          <div className="flex gap-2">
            {signedIn ? (
              <button
                onClick={claimAll}
                disabled={claiming}
                className="btn-ghost text-sm"
                title="Claim unowned / demo agents as yours"
              >
                {claiming ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserPlus size={14} />
                )}
                Claim seed agents
              </button>
            ) : (
              <Link href="/login" className="btn-ghost text-sm">
                Sign in to own agents
              </Link>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-secondary shrink-0 text-sm"
              id="btn-new-agent"
            >
              {showForm ? <ChevronUp size={16} /> : <Plus size={16} />}
              {showForm ? "Close" : "New Agent"}
            </button>
          </div>
        </div>

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

        {showForm && (
          <AgentCreateForm
            signedIn={signedIn}
            onCreated={() => {
              setShowForm(false);
              fetchAgents();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="skeleton h-48 rounded-2xl"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-24 gap-4 border-dashed animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
              <Bot size={28} className="text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="font-medium text-zinc-300">No agents yet</p>
              <p className="text-sm text-zinc-500 mt-1">
                Create your first agent or seed demo data
              </p>
            </div>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
              <Plus size={15} /> Create agent
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {agents.map((agent, i) => (
              <div key={agent.id} style={{ animationDelay: `${i * 0.07}s` }}>
                <AgentCard
                  agent={agent}
                  onRun={runAgent}
                  running={runningId === agent.id}
                  lastResult={runResults[agent.id]}
                  signedIn={signedIn}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
