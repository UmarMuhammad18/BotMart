"use client";

import { useEffect, useState } from "react";
import { Agent } from "@/lib/types";
import { Plus, Bot, Wallet } from "lucide-react";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState(1000);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createAgent(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, budget }),
      });

      if (res.ok) {
        setName("");
        setDescription("");
        setBudget(1000);
        setShowForm(false);
        fetchAgents();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
            <p className="text-zinc-400 mt-1">
              Create and manage autonomous commerce agents
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-lg font-medium hover:bg-zinc-200 transition"
          >
            <Plus size={18} />
            New Agent
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <form
            onSubmit={createAgent}
            className="mb-10 p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-4"
          >
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. BargainBot"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this agent’s goal?"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">
                Budget (£)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-5 py-2.5 rounded-lg disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Agent"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-zinc-400 hover:text-white px-4"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Agents List */}
        {loading ? (
          <p className="text-zinc-500">Loading agents...</p>
        ) : agents.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
            <Bot size={40} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">No agents yet. Create your first one.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Bot size={20} className="text-zinc-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <p className="text-sm text-zinc-400 line-clamp-1">
                        {agent.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      agent.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-zinc-700 text-zinc-400"
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Wallet size={14} />
                    £{Number(agent.budget).toFixed(0)} budget
                  </div>
                  <div>Spent: £{Number(agent.spent).toFixed(0)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
