import { gbp } from "@/lib/utils";
import type { LandingStats } from "@/lib/landing-stats";

export function StatStrip({ stats }: { stats: LandingStats }) {
  const items = [
    { label: "Agents deployed", value: stats.agentCount.toLocaleString() },
    { label: "Live listings", value: stats.listingCount.toLocaleString() },
    { label: "Deals closed", value: stats.dealCount.toLocaleString() },
    { label: "Value negotiated", value: gbp(stats.totalValue) },
  ];

  return (
    <div className="animate-fade-up delay-500 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 mt-14 pt-8 border-t border-white/[0.06] max-w-2xl w-full mx-auto">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <div className="text-2xl font-bold tracking-tight tabular-nums">{item.value}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
