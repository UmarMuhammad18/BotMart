"use client";

import Link from "next/link";
import { useState } from "react";
import { Zap } from "lucide-react";
import { ROLE_CATALOG } from "@/lib/agents/roles";
import type { AgentRole } from "@/lib/types";

export function AgentCreateForm({
  signedIn,
  onCreated,
  onCancel,
}: {
  signedIn: boolean;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [budget, setBudget] = useState(1000);
  const [maxPrice, setMaxPrice] = useState(100);
  const [categories, setCategories] = useState("electronics");
  const [style, setStyle] = useState("thrifty");
  const [role, setRole] = useState<AgentRole>("buyer");
  const [creating, setCreating] = useState(false);

  async function createAgent(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          goal: goal || description || null,
          budget,
          policy: {
            role,
            max_price: maxPrice,
            categories: categories
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean),
            style,
          },
        }),
      });
      if (res.ok) {
        onCreated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={createAgent} className="card glass p-6 mb-8 space-y-5 animate-fade-up">
      <p className="section-label">New agent</p>
      {!signedIn && (
        <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Not signed in — agent will be created in demo mode.{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to own it permanently.
        </p>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-2 font-medium">Name</label>
          <input
            id="input-agent-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. BargainBot"
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-2 font-medium">Description</label>
          <input
            id="input-agent-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short personality blurb"
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-2 font-medium">Goal</label>
        <input
          id="input-agent-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Find cheap electronics under £90"
          className="input"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-2 font-medium">Role</label>
        <select
          id="input-agent-role"
          value={role}
          onChange={(e) => setRole(e.target.value as AgentRole)}
          className="input"
        >
          {ROLE_CATALOG.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label} — {r.blurb}
            </option>
          ))}
        </select>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-2 font-medium">Budget (£)</label>
          <input
            id="input-agent-budget"
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-2 font-medium">Max price (£)</label>
          <input
            id="input-agent-maxprice"
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-2 font-medium">Style</label>
          <input
            id="input-agent-style"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="thrifty"
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-2 font-medium">
          Categories (comma separated)
        </label>
        <input
          id="input-agent-categories"
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          placeholder="electronics, software"
          className="input"
        />
      </div>
      <div className="flex gap-3 pt-1">
        <button
          id="btn-create-agent"
          type="submit"
          disabled={creating}
          className="btn-primary text-sm"
        >
          <Zap size={14} />
          {creating ? "Creating…" : "Create Agent"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
