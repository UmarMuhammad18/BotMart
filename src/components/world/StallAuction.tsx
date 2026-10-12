"use client";

import { useState } from "react";
import { Gavel, Loader2 } from "lucide-react";
import type { AuctionResult } from "@/lib/marketplace/auction";
import type { WorldStall } from "@/lib/types";
import type { WorldDirector } from "@/lib/world/director";
import { gbp } from "@/lib/utils";

/**
 * "Run auction" for a stall: up to 3 interested buyers race for it. The
 * negotiations then arrive as live beats, so the floor plays them out with
 * the bidders queueing at the stall.
 */
export function StallAuction({
  stall,
  director,
  onDone,
}: {
  stall: WorldStall;
  director: WorldDirector;
  onDone: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuctionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const available = stall.status === "active" && stall.stock > 0;

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    // Live beats are held back during a replay; show this auction now
    if (director.mode === "replay") director.goLive();
    try {
      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: stall.id, max_buyers: 3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auction failed");
      setResult(data as AuctionResult);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auction failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void run()}
        disabled={!available || running}
        className="btn-secondary text-xs w-full justify-center border-pink-500/30 text-pink-800 hover:bg-pink-500/10 disabled:opacity-50"
        title={available ? "Up to 3 matching buyers race for this listing" : "Sold out"}
      >
        {running ? (
          <>
            <Loader2 size={12} className="animate-spin" /> Bidders negotiating…
          </>
        ) : (
          <>
            <Gavel size={12} /> Run auction
          </>
        )}
      </button>

      {error && <p className="text-[11px] text-rose-700">{error}</p>}

      {result && (
        <div className="rounded-lg border border-pink-500/20 bg-pink-500/5 px-3 py-2 text-[11px] leading-relaxed">
          {result.participants.length === 0 ? (
            <span className="text-zinc-600">No buyer is interested in this listing.</span>
          ) : (
            <>
              <div className="text-zinc-600">
                {result.participants.length} bidder
                {result.participants.length > 1 ? "s" : ""}:{" "}
                {result.participants.join(", ")}
              </div>
              {result.winner ? (
                <div className="text-pink-800 font-semibold">
                  {result.winner.buyer} won at {gbp(result.winner.price)}
                </div>
              ) : (
                <div className="text-zinc-700">No deal. Every bidder walked.</div>
              )}
              <div className="text-zinc-500">Watch it play out on the floor.</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
