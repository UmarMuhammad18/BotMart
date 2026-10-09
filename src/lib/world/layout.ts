import { resolveRole } from "@/lib/agents/roles";
import type {
  Agent,
  Listing,
  WorldAgent,
  WorldSnapshot,
  WorldStall,
  WorldEvent,
  WorldActivity,
} from "@/lib/types";

/** Deterministic grid slot from id so positions stay stable across refreshes. */
export function slotFromId(id: string, cols: number, spacing: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % (cols * cols);
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  return {
    x: (col - (cols - 1) / 2) * spacing,
    z: (row - (cols - 1) / 2) * spacing,
  };
}

export function activityForAgent(
  agent: Agent,
  negotiatingIds: Set<string>
): WorldActivity {
  if (agent.status === "blocked" || agent.status === "paused") return "blocked";
  if (negotiatingIds.has(agent.id)) return "negotiating";
  const role = resolveRole(agent.policy);
  if (role.startsWith("juror") || role === "judge" || role === "auditor")
    return "jury";
  if (role === "scout") return "scouting";
  return "idle";
}

export function buildWorldSnapshot(opts: {
  agents: Agent[];
  listings: (Listing & { seller?: { name?: string } | null })[];
  openNegotiations: { buyer_agent_id: string; seller_agent_id: string }[];
  recentDecisions?: { id: string; action_type: string | null; payload: Record<string, unknown>; created_at: string; agent_id: string }[];
}): WorldSnapshot {
  const negotiatingIds = new Set<string>();
  for (const n of opts.openNegotiations) {
    negotiatingIds.add(n.buyer_agent_id);
    negotiatingIds.add(n.seller_agent_id);
  }

  const agents: WorldAgent[] = opts.agents.map((a) => {
    const slot =
      a.world_x != null && a.world_z != null
        ? { x: Number(a.world_x), z: Number(a.world_z) }
        : slotFromId(a.id, 6, 3.2);
    return {
      id: a.id,
      name: a.name,
      role: resolveRole(a.policy),
      status: a.status,
      activity: (a.world_activity as WorldActivity) || activityForAgent(a, negotiatingIds),
      x: slot.x,
      z: slot.z,
      budget: Number(a.budget),
      reputation: Number(a.reputation),
    };
  });

  const stalls: WorldStall[] = opts.listings.map((l, i) => {
    const slot =
      l.world_x != null && l.world_z != null
        ? { x: Number(l.world_x), z: Number(l.world_z) }
        : {
            x: ((i % 5) - 2) * 4.5,
            z: (Math.floor(i / 5) - 1) * 4.5 - 6,
          };
    return {
      id: l.id,
      title: l.title,
      price: Number(l.price),
      category: l.category,
      stock: l.stock,
      status: l.status,
      x: slot.x,
      z: slot.z,
      seller_name: l.seller?.name ?? null,
    };
  });

  const events: WorldEvent[] = (opts.recentDecisions || []).slice(0, 12).map((d) => ({
    id: d.id,
    at: d.created_at,
    kind:
      d.action_type === "accept"
        ? "deal"
        : d.action_type === "court"
          ? "court"
          : "negotiate",
    text: `${d.action_type || "action"}: ${JSON.stringify(d.payload?.message || d.payload?.type || "").slice(0, 80)}`,
  }));

  return {
    agents,
    stalls,
    events,
    open_negotiations: opts.openNegotiations.length,
    live: true,
  };
}
