"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Boxes, Play } from "lucide-react";

/**
 * Hero calls to action, in priority order: one primary (demo), one secondary
 * (the 3D world), one quiet text link. Agents / Marketplace / Dashboard are
 * already in the header nav, and the demo seeds data itself.
 */
export function HeroActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function demo() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "The demo couldn't start. Try again in a moment.");
        return;
      }
      sessionStorage.setItem("botmart-demo-neg", JSON.stringify(data));
      router.push("/negotiate?demo=1");
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-lg lg:max-w-none">
      <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
        <button
          type="button"
          onClick={demo}
          disabled={busy}
          aria-busy={busy}
          className="btn-primary text-base px-7 py-3.5 rounded-xl w-full sm:w-auto justify-center"
          id="btn-one-click-demo"
        >
          {busy ? (
            <span className="thinking-dots flex gap-1" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          ) : (
            <Play size={18} className="fill-white" aria-hidden />
          )}
          {busy ? "Spinning up demo…" : "One-click demo"}
        </button>

        <Link
          href="/world"
          className="btn-secondary text-base px-7 py-3.5 rounded-xl w-full sm:w-auto justify-center"
          id="btn-enter-world"
        >
          <Boxes size={18} aria-hidden />
          Enter the 3D world
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <Link
        href="/negotiate"
        className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        id="btn-go-negotiate"
      >
        or start a negotiation yourself
        <ArrowRight size={14} aria-hidden />
      </Link>
    </div>
  );
}
