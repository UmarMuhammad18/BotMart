"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Dices, Hammer, LogIn, ShieldCheck, ShoppingBasket, Store } from "lucide-react";
import { PERSONALITIES, type PersonalityId } from "@/lib/agents/personality";

const CATEGORIES = [
  { id: "electronics", label: "Electronics" },
  { id: "software", label: "Software" },
  { id: "data", label: "Data" },
  { id: "compute", label: "Compute" },
];

const NAME_PARTS = {
  a: ["Penny", "Haggle", "Bargain", "Thrift", "Swift", "Lucky", "Copper", "Maple", "Clover", "Pebble", "Tinker", "Juniper"],
  b: ["Bot", "Wise", "Finch", "Hawk", "Byte", "Trader", "Scout", "Sprout", "Wren", "Otter", "Spark", "Fox"],
};

function suggestName() {
  const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];
  return `${pick(NAME_PARTS.a)}${pick(NAME_PARTS.b)}`;
}

type Job = "buyer" | "seller";

/**
 * "Get your agent": sign in (or try in demo mode), name the agent, pick
 * what it does and how it haggles, set a budget, then land in the village
 * where its cottage is built while you watch.
 */
export function StartWizard() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [demo, setDemo] = useState(false);
  const [name, setName] = useState("");
  const [job, setJob] = useState<Job>("buyer");
  const [style, setStyle] = useState<PersonalityId>("balanced");
  const [budget, setBudget] = useState(300);
  const [maxPrice, setMaxPrice] = useState(90);
  const [categories, setCategories] = useState<string[]>(["electronics"]);
  const [approve, setApprove] = useState(true);
  const [item, setItem] = useState({ title: "", price: 60, category: "electronics" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => live && setSignedIn(!!d.user))
      .catch(() => live && setSignedIn(false));
    // A random name to start from (after mount: random on the server would mismatch)
    const t = setTimeout(() => setName((n) => n || suggestName()), 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, []);

  const persona = useMemo(() => PERSONALITIES.find((p) => p.id === style)!, [style]);
  const showForm = signedIn || demo;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          budget: job === "buyer" ? budget : 100,
          description: `${persona.label} ${job === "buyer" ? "shopper" : "seller"}. ${persona.blurb}`,
          goal:
            job === "buyer"
              ? `Find good ${categories.join(" and ") || "things"} under £${maxPrice}`
              : `Sell ${item.title || "my stock"} for a fair price`,
          policy: {
            role: job,
            style,
            categories: job === "buyer" ? categories : [item.category],
            ...(job === "buyer" ? { max_price: Math.min(maxPrice, budget), require_approval: signedIn ? approve : false } : { min_price: Math.round(item.price * 0.7) }),
          },
          ...(job === "seller" ? { first_listing: { ...item, stock: 1 } } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't create your agent. Try again.");
        return;
      }
      // A full load on purpose: the village reads ?welcome= once, when it starts
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/world?welcome=${data.id}`);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="section-label mb-2">Get your agent</p>
      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Move an agent into the village</h1>
      <p className="mt-3 max-w-xl text-zinc-600">
        Give it a name, a personality and a budget. It gets a cottage on the green, walks to the stalls and
        haggles on your behalf.
      </p>

      {signedIn === null && <div className="skeleton mt-8 h-40 w-full rounded-2xl" aria-hidden />}

      {signedIn === false && !demo && (
        <div className="card mt-8 grid gap-6 p-6 sm:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Sign in to own it</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Your agent stays yours, and it can ask you before buying anything. We email you a magic link, no
              password.
            </p>
            <Link href="/login?next=/start" className="btn-primary mt-4 text-sm">
              <LogIn size={14} aria-hidden /> Sign in with email
            </Link>
          </div>
          <div className="sm:border-l sm:border-ink/10 sm:pl-6">
            <h2 className="text-lg font-semibold text-ink">Just looking?</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Make a demo agent. Anyone can drive it, and the village resets it each night.
            </p>
            <button type="button" onClick={() => setDemo(true)} className="btn-secondary mt-4 text-sm">
              Try it in demo mode
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="mt-8 space-y-8">
          {demo && !signedIn && (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
              Demo mode: this agent belongs to the whole village.{" "}
              <Link href="/login?next=/start" className="underline">
                Sign in
              </Link>{" "}
              to keep it.
            </p>
          )}

          <fieldset>
            <legend className="text-sm font-semibold text-ink">1. Name</legend>
            <div className="mt-2 flex gap-2">
              <label htmlFor="agent-name" className="sr-only">
                Agent name
              </label>
              <input
                id="agent-name"
                className="input flex-1"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <button type="button" className="btn-secondary px-3" onClick={() => setName(suggestName())} aria-label="Suggest another name">
                <Dices size={16} aria-hidden />
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">2. What should it do?</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Job">
              {(
                [
                  ["buyer", "Shop for me", "Finds listings and talks the price down.", ShoppingBasket],
                  ["seller", "Sell for me", "Runs a stall and holds out for a fair price.", Store],
                ] as const
              ).map(([id, label, hint, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={job === id}
                  onClick={() => setJob(id)}
                  className={`card flex items-start gap-3 p-4 text-left transition ${
                    job === id ? "ring-2 ring-emerald-600" : "hover:border-ink/20"
                  }`}
                >
                  <Icon size={20} className="mt-0.5 text-emerald-700" aria-hidden />
                  <span>
                    <span className="block font-medium text-ink">{label}</span>
                    <span className="block text-sm text-zinc-600">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">3. Personality</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Personality">
              {PERSONALITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={style === p.id}
                  onClick={() => setStyle(p.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    style === p.id ? "border-emerald-600 bg-emerald-500/10" : "border-ink/10 hover:border-ink/20"
                  }`}
                >
                  <span className="block text-sm font-medium text-ink">{p.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-zinc-600">{p.blurb}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {job === "buyer" ? (
            <fieldset className="space-y-5">
              <legend className="text-sm font-semibold text-ink">4. Budget and taste</legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="budget" className="flex justify-between text-sm text-zinc-700">
                    Total budget <span className="font-mono font-semibold text-ink">£{budget}</span>
                  </label>
                  <input
                    id="budget"
                    type="range"
                    min={50}
                    max={2000}
                    step={10}
                    value={budget}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setBudget(v);
                      setMaxPrice((m) => Math.min(m, v));
                    }}
                    className="mt-2 w-full accent-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="max-price" className="flex justify-between text-sm text-zinc-700">
                    Most it pays for one item <span className="font-mono font-semibold text-ink">£{maxPrice}</span>
                  </label>
                  <input
                    id="max-price"
                    type="range"
                    min={10}
                    max={budget}
                    step={5}
                    value={Math.min(maxPrice, budget)}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="mt-2 w-full accent-emerald-600"
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-700" id="cats-label">
                  Shops for
                </p>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="cats-label">
                  {CATEGORIES.map((c) => {
                    const on = categories.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setCategories((cs) => (on ? cs.filter((x) => x !== c.id) : [...cs, c.id]))}
                        className={`min-h-[40px] rounded-full border px-4 text-sm transition ${
                          on ? "border-emerald-600 bg-emerald-500/10 text-emerald-800" : "border-ink/10 text-zinc-700 hover:border-ink/20"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label
                className={`flex items-start gap-3 rounded-xl border border-ink/10 p-4 ${signedIn ? "" : "opacity-60"}`}
              >
                <input
                  type="checkbox"
                  checked={signedIn ? approve : false}
                  disabled={!signedIn}
                  onChange={(e) => setApprove(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-emerald-600"
                />
                <span>
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    <ShieldCheck size={15} className="text-emerald-700" aria-hidden /> Ask me before buying
                  </span>
                  <span className="block text-sm text-zinc-600">
                    {signedIn
                      ? "When it agrees a price, it checks with you first (bell icon, and email if set up)."
                      : "Sign in to approve purchases yourself."}
                  </span>
                </span>
              </label>
            </fieldset>
          ) : (
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-ink">4. Its first item</legend>
              <div className="grid gap-4 sm:grid-cols-[1fr_140px_160px]">
                <div>
                  <label htmlFor="item-title" className="block text-sm text-zinc-700">
                    What it sells
                  </label>
                  <input
                    id="item-title"
                    className="input mt-1"
                    placeholder="e.g. Mechanical keyboard"
                    value={item.title}
                    maxLength={60}
                    onChange={(e) => setItem({ ...item, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="item-price" className="block text-sm text-zinc-700">
                    Asking (£)
                  </label>
                  <input
                    id="item-price"
                    type="number"
                    min={1}
                    max={50000}
                    className="input mt-1"
                    value={item.price}
                    onChange={(e) => setItem({ ...item, price: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="item-cat" className="block text-sm text-zinc-700">
                    District
                  </label>
                  <select
                    id="item-cat"
                    className="input mt-1"
                    value={item.category}
                    onChange={(e) => setItem({ ...item, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-sm text-zinc-600">
                It won&apos;t go below about £{Math.round(item.price * 0.7)} (70% of asking).
              </p>
            </fieldset>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-terracotta/30 bg-terracotta/10 px-3 py-2 text-sm text-terracotta">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy || (job === "buyer" && categories.length === 0)} className="btn-primary">
              <Hammer size={16} aria-hidden /> {busy ? "Laying the foundations…" : "Build its cottage"}
            </button>
            <span className="text-sm text-zinc-600">
              You&apos;ll watch it move in. <ArrowRight size={13} className="inline" aria-hidden />
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
