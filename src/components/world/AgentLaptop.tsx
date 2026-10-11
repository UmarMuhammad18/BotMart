/** Short status line for an agent's desk monitor in the village. */
export function laptopTextForAgent(
  agent: {
    name: string;
    activity: string;
    role: string;
    goal: string | null;
  },
  stalls: { title: string; seller_name: string | null; seller_id?: string | null; price: number }[],
  agentId: string
): string {
  // Prefer a listing this agent sells
  const mine =
    stalls.find((s) => s.seller_id === agentId) ||
    stalls.find(
      (s) =>
        s.seller_name &&
        s.seller_name.toLowerCase() === agent.name.toLowerCase()
    );
  if (mine) return `SELL · ${mine.title}`;

  if (agent.activity === "negotiating") return "NEGOTIATING…";
  if (agent.activity === "scouting") return "SCOUTING MARKET";
  if (agent.activity === "jury") return "COURT SESSION";
  if (agent.goal) {
    const g = agent.goal.length > 20 ? agent.goal.slice(0, 19) + "…" : agent.goal;
    return g;
  }
  if (agent.role === "buyer") return "LOOKING TO BUY";
  if (agent.role === "seller") return "OPEN FOR OFFERS";
  return agent.role.toUpperCase();
}
