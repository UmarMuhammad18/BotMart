"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Package, Search, X, Tag, Layers, ChevronRight } from "lucide-react";
import { Agent, ListingWithSeller } from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";
import { gbp } from "@/lib/utils";

const CATEGORIES = ["All", "electronics", "software", "data", "compute"];

function ListingCard({
  listing, onNegotiate,
}: {
  listing: ListingWithSeller;
  onNegotiate: (id: string) => void;
}) {
  return (
    <div className="card card-interactive p-5 flex flex-col gap-3 animate-fade-up">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {listing.category && (
              <span className="badge badge-zinc text-[10px]">{listing.category}</span>
            )}
            {typeof listing.match_score === "number" && (
              <span className="badge badge-emerald text-[10px]">
                ★ {listing.match_score} match
              </span>
            )}
          </div>
          <h3 className="font-semibold text-base leading-snug">{listing.title}</h3>
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
            {listing.description || "No description"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold font-mono">{gbp(listing.price)}</div>
          <div className="text-xs text-zinc-600 mt-0.5 flex items-center justify-end gap-1">
            <Layers size={10} />
            {listing.stock} in stock
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <div className="text-xs text-zinc-500 flex items-center gap-1">
          <Tag size={11} />
          Sold by{" "}
          <span className="text-zinc-300 font-medium ml-0.5">
            {listing.seller?.name ?? "Unknown"}
          </span>
        </div>
        <button
          onClick={() => onNegotiate(listing.id)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition group"
          id={`btn-negotiate-${listing.id}`}
        >
          Negotiate
          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

export default function ListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingWithSeller[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showIntent, setShowIntent] = useState(false);
  const [creating, setCreating] = useState(false);
  const [matching, setMatching] = useState(false);

  const [sellerId, setSellerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(50);
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState(1);

  const [q, setQ] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [buyerId, setBuyerId] = useState("");
  const [goal, setGoal] = useState("Find cheap electronics under £80");

  useEffect(() => {
    Promise.all([fetchListings(), fetchAgents()]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchListings(params?: { q?: string; maxPrice?: string; category?: string }) {
    try {
      const sp = new URLSearchParams();
      if (params?.q) sp.set("q", params.q);
      if (params?.maxPrice) sp.set("maxPrice", params.maxPrice);
      if (params?.category && params.category !== "All") sp.set("category", params.category);
      const res = await fetch(`/api/listings?${sp.toString()}`);
      const data = await res.json();
      setListings(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function fetchAgents() {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setAgents(list);
      if (list.length > 0) { setSellerId(list[0].id); setBuyerId(list[0].id); }
    } catch (err) { console.error(err); }
  }

  async function createListing(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller_agent_id: sellerId, title, description, price, category, stock }),
      });
      if (res.ok) {
        setTitle(""); setDescription(""); setPrice(50); setCategory(""); setStock(1);
        setShowForm(false);
        fetchListings();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create listing");
      }
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  }

  async function createIntent(e: React.FormEvent) {
    e.preventDefault();
    setMatching(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer_agent_id: buyerId, goal }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Match failed"); return; }
      setListings(data.listings || []);
    } finally { setMatching(false); }
  }

  function startDeal(listingId: string) {
    sessionStorage.setItem("botmart-start", JSON.stringify({ buyerId, listingId }));
    router.push("/negotiate?start=1");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchListings({ q, maxPrice, category: activeCategory });
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader active="/listings" />
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8 animate-fade-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
            <p className="text-zinc-500 mt-1 text-sm">
              {listings.length} listing{listings.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { setShowIntent(!showIntent); setShowForm(false); }}
              className={`btn-ghost text-sm ${showIntent ? "text-white border-white/20" : ""}`}
              id="btn-create-intent"
            >
              <Search size={15} />
              AI Match
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setShowIntent(false); }}
              className="btn-secondary text-sm"
              id="btn-new-listing"
            >
              <Plus size={15} />
              New Listing
            </button>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6 animate-fade-up delay-100">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
            <input
              id="input-search-listings"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search listings…"
              className="input pl-9"
            />
          </div>
          <input
            id="input-max-price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max £"
            type="number"
            className="input w-28"
          />
          <button type="submit" className="btn-secondary text-sm px-4">Search</button>
        </form>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap mb-8 animate-fade-up delay-150">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                fetchListings({ q, maxPrice, category: cat });
              }}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition ${
                activeCategory === cat
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-white/[0.03] border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/15"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* AI Intent panel */}
        {showIntent && (
          <form
            onSubmit={createIntent}
            className="card glass p-6 mb-8 space-y-4 animate-fade-up"
          >
            <div className="flex items-center justify-between">
              <p className="section-label">AI-powered matching</p>
              <button type="button" onClick={() => setShowIntent(false)} className="text-zinc-600 hover:text-zinc-400">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Describe what you want in natural language and BotMart will rank listings by budget, category, and seller reputation.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Buyer agent</label>
                <select
                  id="select-intent-buyer"
                  value={buyerId}
                  onChange={(e) => setBuyerId(e.target.value)}
                  className="input"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({gbp(Number(a.budget) - Number(a.spent))} left)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Natural language goal</label>
                <input
                  id="input-intent-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            <button
              id="btn-find-matches"
              type="submit"
              disabled={matching}
              className="btn-primary text-sm"
            >
              <Search size={14} />
              {matching ? "Matching…" : "Find matches"}
            </button>
          </form>
        )}

        {/* New listing form */}
        {showForm && (
          <form
            onSubmit={createListing}
            className="card glass p-6 mb-8 space-y-5 animate-fade-up"
          >
            <div className="flex items-center justify-between">
              <p className="section-label">New listing</p>
              <button type="button" onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-zinc-400">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-2 font-medium">Seller Agent</label>
              <select id="select-seller-agent" value={sellerId} onChange={(e) => setSellerId(e.target.value)} required className="input">
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({gbp(a.budget)} budget)</option>
                ))}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Title</label>
                <input id="input-listing-title" value={title} onChange={(e) => setTitle(e.target.value)}
                  required placeholder="e.g. Premium Wireless Headphones" className="input" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Description</label>
                <input id="input-listing-desc" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description" className="input" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Price (£)</label>
                <input id="input-listing-price" type="number" value={price}
                  onChange={(e) => setPrice(Number(e.target.value))} required className="input" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Category</label>
                <input id="input-listing-category" value={category} onChange={(e) => setCategory(e.target.value)}
                  placeholder="electronics" className="input" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Stock</label>
                <input id="input-listing-stock" type="number" value={stock}
                  onChange={(e) => setStock(Number(e.target.value))} className="input" />
              </div>
            </div>
            <div className="flex gap-3">
              <button id="btn-create-listing-submit" type="submit" disabled={creating} className="btn-primary text-sm">
                <Plus size={15} />
                {creating ? "Creating…" : "Create Listing"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-44 rounded-2xl" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-24 gap-4 border-dashed animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
              <Package size={28} className="text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="font-medium text-zinc-300">No listings found</p>
              <p className="text-sm text-zinc-500 mt-1">Try seeding demo data or create a new listing</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {listings.map((listing, i) => (
              <div key={listing.id} style={{ animationDelay: `${i * 0.07}s` }}>
                <ListingCard listing={listing} onNegotiate={startDeal} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
