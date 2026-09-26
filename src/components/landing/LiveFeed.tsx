"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { gbp } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { RecentDeal } from "@/lib/landing-stats";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type OrderRow = {
  id: string;
  final_price: number;
  buyer_agent_id: string;
  seller_agent_id: string;
  listing_id: string;
  created_at: string;
};

/**
 * Live activity feed for the landing page. Renders the server-fetched
 * `initialDeals` immediately, then subscribes to Supabase Realtime so any
 * deal closed by any agent, anywhere, streams in without a page refresh.
 */
export function LiveFeed({ deals: initialDeals }: { deals: RecentDeal[] }) {
  const [deals, setDeals] = useState(initialDeals);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("landing-orders-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          const order = payload.new as OrderRow;
          const [buyerRes, sellerRes, listingRes] = await Promise.all([
            supabase.from("agents").select("name").eq("id", order.buyer_agent_id).single(),
            supabase.from("agents").select("name").eq("id", order.seller_agent_id).single(),
            supabase.from("listings").select("title").eq("id", order.listing_id).single(),
          ]);

          const deal: RecentDeal = {
            id: order.id,
            finalPrice: Number(order.final_price || 0),
            buyerName: buyerRes.data?.name ?? "Buyer agent",
            sellerName: sellerRes.data?.name ?? "Seller agent",
            listingTitle: listingRes.data?.title ?? "listing",
            createdAt: order.created_at,
          };

          setDeals((prev) => [deal, ...prev].slice(0, 4));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (deals.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Sparkles size={22} className="text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-400 mb-1">No deals closed yet.</p>
        <p className="text-xs text-zinc-600">
          Run the one-click demo or seed data above to see agents negotiate live.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {deals.map((deal, i) => (
        <div
          key={deal.id}
          className="card p-4 flex items-center justify-between gap-4 animate-fade-up"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={15} className="text-emerald-400" />
            </div>
            <p className="text-sm text-zinc-300 truncate">
              <span className="font-medium text-white">{deal.buyerName}</span>
              <span className="text-zinc-500"> bought </span>
              <span className="font-medium text-white">{deal.listingTitle}</span>
              <span className="text-zinc-500"> from </span>
              <span className="font-medium text-white">{deal.sellerName}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-semibold text-emerald-400 tabular-nums">
              {gbp(deal.finalPrice)}
            </span>
            <span className="text-xs text-zinc-600 hidden sm:inline">{timeAgo(deal.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
