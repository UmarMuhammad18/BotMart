/** A seller-trust badge from a 0–100 reputation score. */
export function trustLabel(reputation: number): { label: string; tier: "high" | "good" | "new" | "low"; className: string } {
  if (reputation >= 72) return { label: "Trusted", tier: "high", className: "border-emerald-600/30 bg-emerald-500/10 text-emerald-800" };
  if (reputation >= 55) return { label: "Reliable", tier: "good", className: "border-teal/30 bg-teal/10 text-teal" };
  if (reputation >= 40) return { label: "Finding its feet", tier: "new", className: "border-ink/10 bg-ink/5 text-zinc-700" };
  return { label: "Shaky", tier: "low", className: "border-terracotta/30 bg-terracotta/10 text-terracotta" };
}
