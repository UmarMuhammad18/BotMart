import { CheckCircle2 } from "lucide-react";
import { gbp } from "@/lib/utils";
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

export function LiveFeed({ deals }: { deals: RecentDeal[] }) {
  if (deals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
        <p className="text-base font-medium text-zinc-200">No deals closed yet.</p>
        <p className="mt-1 text-sm text-zinc-500">
          Run the one-click demo and the first one lands here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-[#0b0d10]">
      {deals.map((deal) => (
        <li
          key={deal.id}
          className="px-4 py-4 sm:px-5 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={15} className="text-emerald-400" aria-hidden />
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
        </li>
      ))}
    </ul>
  );
}
