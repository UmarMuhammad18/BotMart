"use client";

import { useEffect, useState } from "react";
import { Agent } from "@/lib/types";
import {
  Plus, Bot, Wallet, Zap, ChevronDown, ChevronUp, TrendingUp, Shield,
  Pencil, Trash2, X, Check,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { gbp } from "@/lib/utils";

const STYLE_OPTIONS = [
  { value: "thrifty", label: "Thrifty — opens low, walks if pricey" },
  { value: "impatient", label: "Impatient — values speed over savings" },
  { value: "friendly", label: "Friendly — flexible, builds reputation" },
  { value: "firm", label: "Firm — protects margin, rarely budges" },
  { value: "balanced", label: "Balanced — measured, fair offers" },
];

const CATEGORY_SUGGESTIONS = ["electronics", "software", "data", "compute"];

type AgentFormState = {
  name: string;
  description: string;
  budget: number;
  maxPrice: number;
  minPrice: string;
  categories: string;
  style: string;
};

const DEFAULT_FORM: AgentFormState = {
  name: "",
  description: "",
  budget: 1000,
  maxPrice: 100,
  minPrice: "",
  categories: "electronics",
  style: "thrifty",
};

function AgentCard({
  agent,
  onEdit,
  onDelete,
  deleting,
}: {
  agent: Agent;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const spent = Number(agent.spent ?? 0);
  const budget = Number(agent.budget ?? 0);
  const usedPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

  return (
    <div className="card card-interactive p-5 animate-fade-up group relative">
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
          id={`btn-edit-agent-${agent.id}`}
          aria-label={`Edit ${agent.name}`}
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition disabled:opacity-50"
          id={`btn-delete-agent-${agent.id}`}
          aria-label={`Delete ${agent.name}`}
        >
          <Trash2 size={12} />
        </button>
      </div>

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
            <h3 className="font-semibold text-sm pr-14">{agent.name}</h3>
            <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5 pr-14">
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

function AgentForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
  error,
}: {
  form: AgentFormState;
  setForm: (updater: (prev: AgentFormState) => AgentFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
  error: string | null;
}) {
  return (
    <form onSubmit={onSubmit} className="card glass p-6 mb-8 space-y-5 animate-fade-up">
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-2 font-medium">Name</label>
          <input
            id="input-agent-name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
            placeholder="e.g. BargainBot"
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-2 font-medium">Description</label>
          <input
            id="input-agent-desc"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="What is this agent's goal?"
            className="input"
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-2 font-medium">Budget (£)</label>
          <input
            id="input-agent-budget"
            type="number"
            min={0}
            value={form.budget}
            onChange={(e) => setForm((p) => ({ ...p, budget: Number(e.target.value) }))}
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-2 font-medium">Max price (£)</label>
          <input
            id="input-agent-maxprice"
            type="number"
            min={0}
            value={form.maxPrice}
            onChange={(e) => setForm((p) => ({ ...p, maxPrice: Number(e.target.value) }))}
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-2 font-medium">Negotiation style</label>
          <select
            id="input-agent-style"
            value={form.style}
            onChange={(e) => setForm((p) => ({ ...p, style: e.target.value }))}
            className="input"
          >
            {STYLE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-2 font-medium">
          Categories (comma separated)
        </label>
        <input
          id="input-agent-categories"
          value={form.categories}
          onChange={(e) => setForm((p) => ({ ...p, categories: e.target.value }))}
          placeholder="electronics, software"
          list="category-suggestions"
          className="input"
        />
        <datalist id="category-suggestions">
          {CATEGORY_SUGGESTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="flex gap-3 pt-1">
        <button id="btn-submit-agent" type="submit" disabled={submitting} className="btn-primary text-sm">
          {submitLabel === "Save changes" ? <Check size={14} /> : <Zap size={14} />}
          {submitting ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

function agentToForm(agent: Agent): AgentFormState {
  return {
    name: agent.name,
    description: agent.description ?? "",
    budget: Number(agent.budget ?? 0),
    maxPrice: Number(agent.policy?.max_price ?? 0),
    minPrice: agent.policy?.min_price !== undefined ? String(agent.policy.min_price) : "",
    categories: (agent.policy?.categories ?? []).join(", "),
    style: agent.policy?.style ?? "thrifty",
  };
}

function formToPayload(form: AgentFormState) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    budget: form.budget,
    policy: {
      max_price: form.maxPrice,
      ...(form.minPrice.trim() ? { min_price: Number(form.minPrice) } : {}),
      categories: form.categories.split(",").map((c) => c.trim()).filter(Boolean),
      style: form.style,
    },
  };
}

function validateForm(form: AgentFormState): string | null {
  if (!form.name.trim()) return "Name is required.";
  if (form.budget < 0) return "Budget cannot be negative.";
  if (form.maxPrice < 0) return "Max price cannot be negative.";
  if (form.minPrice.trim() && Number(form.minPrice) > form.maxPrice) {
    return "Min price cannot be greater than max price.";
  }
  return null;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [createForm, setCreateForm] = useState<AgentFormState>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AgentFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    const validationError = validateForm(createForm);
    if (validationError) { setCreateError(validationError); return; }
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(createForm)),
      });
      if (res.ok) {
        setCreateForm(DEFAULT_FORM);
        setShowForm(false);
        fetchAgents();
      } else {
        const body = await res.json().catch(() => ({}));
        setCreateError(body.error ?? "Failed to create agent.");
      }
    } catch (err) { console.error(err); setCreateError("Failed to create agent."); }
    finally { setCreating(false); }
  }

  function startEdit(agent: Agent) {
    setEditingId(agent.id);
    setEditForm(agentToForm(agent));
    setEditError(null);
    setShowForm(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const validationError = validateForm(editForm);
    if (validationError) { setEditError(validationError); return; }
    setEditError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(editForm)),
      });
      if (res.ok) {
        setEditingId(null);
        fetchAgents();
      } else {
        const body = await res.json().catch(() => ({}));
        setEditError(body.error ?? "Failed to save changes.");
      }
    } catch (err) { console.error(err); setEditError("Failed to save changes."); }
    finally { setSaving(false); }
  }

  async function deleteAgent(id: string) {
    if (!window.confirm("Delete this agent? This cannot be undone.")) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAgents();
      } else {
        const body = await res.json().catch(() => ({}));
        setDeleteError(body.error ?? "Failed to delete agent.");
      }
    } catch (err) { console.error(err); setDeleteError("Failed to delete agent."); }
    finally { setDeletingId(null); }
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
            onClick={() => {
              setEditingId(null);
              setShowForm(!showForm);
            }}
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

        {deleteError && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-6 flex items-center justify-between gap-3">
            {deleteError}
            <button onClick={() => setDeleteError(null)} aria-label="Dismiss" className="text-red-400/70 hover:text-red-300">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="mb-8">
            <p className="section-label">New agent</p>
            <AgentForm
              form={createForm}
              setForm={setCreateForm}
              onSubmit={createAgent}
              onCancel={() => { setShowForm(false); setCreateError(null); }}
              submitting={creating}
              submitLabel="Create Agent"
              error={createError}
            />
          </div>
        )}

        {/* Edit form */}
        {editingId && (
          <div className="mb-8">
            <p className="section-label">Edit agent</p>
            <AgentForm
              form={editForm}
              setForm={setEditForm}
              onSubmit={saveEdit}
              onCancel={() => { setEditingId(null); setEditError(null); }}
              submitting={saving}
              submitLabel="Save changes"
              error={editError}
            />
          </div>
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
                <AgentCard
                  agent={agent}
                  onEdit={() => startEdit(agent)}
                  onDelete={() => deleteAgent(agent.id)}
                  deleting={deletingId === agent.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
