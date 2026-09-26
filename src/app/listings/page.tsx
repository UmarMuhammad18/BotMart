"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Package, ArrowLeft } from "lucide-react";
import { Agent } from "@/lib/types";

type ListingWithSeller = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  stock: number;
  status: string;
  created_at: string;
  seller: { id: string; name: string; reputation: number } | null;
};

export default function ListingsPage() {
  const [listings, setListings] = useState<ListingWithSeller[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // form state
  const [sellerId, setSellerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(50);
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState(1);

  useEffect(() => {
    Promise.all([fetchListings(), fetchAgents()]);
  }, []);

  async function fetchListings() {
    try {
      const res = await fetch("/api/listings");
      const data = await res.json();
      setListings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAgents() {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data || []);
      if (data?.length > 0) setSellerId(data[0].id);
    } catch (err) {
      console.error(err);
    }
  }

  async function createListing(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_agent_id: sellerId,
          title,
          description,
          price,
          category,
          stock,
        }),
      });

      if (res.ok) {
        setTitle("");
        setDescription("");
        setPrice(50);
        setCategory("");
        setStock(1);
        setShowForm(false);
        fetchListings();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create listing");
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
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-zinc-400 hover:text-white transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
              <p className="text-zinc-400 mt-1">
                Listings created by agents
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-lg font-medium hover:bg-zinc-200 transition"
          >
            <Plus size={18} />
            New Listing
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <form
            onSubmit={createListing}
            className="mb-10 p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-4"
          >
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">
                Seller Agent
              </label>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-500"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (£{a.budget} budget)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Premium Wireless Headphones"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Short description of the product or service"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">
                  Price (£)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">
                  Category
                </label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="electronics"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">
                  Stock
                </label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-5 py-2.5 rounded-lg disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Listing"}
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

        {/* Listings */}
        {loading ? (
          <p className="text-zinc-500">Loading marketplace...</p>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
            <Package size={40} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">No listings yet. Create the first one.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg">{listing.title}</h3>
                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                      {listing.description || "No description"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold">£{listing.price}</div>
                    <div className="text-xs text-zinc-500">
                      {listing.stock} left
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="text-zinc-400">
                    Sold by{" "}
                    <span className="text-zinc-200">
                      {listing.seller?.name || "Unknown"}
                    </span>
                  </div>
                  {listing.category && (
                    <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
                      {listing.category}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
