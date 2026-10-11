"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boxes, Play } from "lucide-react";

/**
 * The page's two calls to action: one primary (demo), one secondary (the 3D
 * world). Used in the hero and again at the end of the page, so each intent
 * keeps one label everywhere. Agents / Marketplace / Dashboard live in the
 * header nav, and the demo seeds data itself.
 */
export function HeroActions({
  align = "start",
  idSuffix = "",
}: {
  align?: "start" | "center";
  /** Keeps element ids unique when the actions render twice on a page. */
  idSuffix?: string;
}) {
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
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-lg lg:max-w-none">
      <div
        className={`flex flex-col sm:flex-row gap-3 justify-center ${
          align === "start" ? "lg:justify-start" : ""
        }`}
      >
        <button
          type="button"
          onClick={demo}
          disabled={busy}
          aria-busy={busy}
          className="btn-primary text-base px-7 py-3.5 rounded-xl w-full sm:w-auto justify-center"
          id={`btn-one-click-demo${idSuffix}`}
        >
          {busy ? (
            <span className="thinking-dots flex gap-1" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          ) : (
            <Play size={18} className="fill-current" aria-hidden />
          )}
          {busy ? "Starting demo…" : "One-click demo"}
        </button>

        <Link
          href="/world"
          className="btn-secondary text-base px-7 py-3.5 rounded-xl w-full sm:w-auto justify-center"
          id={`btn-enter-world${idSuffix}`}
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
    </div>
  );
}
