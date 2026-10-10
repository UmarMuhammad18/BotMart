import { resolveRole } from "@/lib/agents/roles";
import type {
  Agent,
  Listing,
  WorldAgent,
  WorldSnapshot,
  WorldStall,
  WorldEvent,
  WorldActivity,
  WorldLink,
  WorldDealPopup,
} from "@/lib/types";

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
  if (
    role.startsWith("juror") ||
    role === "judge" ||
    role === "auditor"
  )
    return "jury";
  if (role === "scout") return "scouting";
  return "idle";
}

export function buildWorldSnapshot(opts: {
  agents: Agent[];
  listings: (Listing & { seller?: { name?: string } | null })[];
  openNegotiations: {
    buyer_agent_id: string;
    seller_agent_id: string;
    listing_id?: string;
  }[];
  recentDecisions?: {
    id: string;
    action_type: string | null;
    payload: Record<string, unknown>;
    created_at: string;
    agent_id: string;
  }[];
  recentOrders?: {
    id: string;
    final_price: number;
    listing_id: string;
    created_at: string;
  }[];
}): WorldSnapshot {
  const negotiatingIds = new Set<string>();
  const buyerToListing = new Map<string, string>();
  for (const n of opts.openNegotiations) {
    negotiatingIds.add(n.buyer_agent_id);
    negotiatingIds.add(n.seller_agent_id);
    if (n.listing_id) buyerToListing.set(n.buyer_agent_id, n.listing_id);
  }

  // Stalls in a tight market grid centered near origin (was pushed to z=-6)
  const stalls: WorldStall[] = opts.listings.map((l, i) => {
    const cols = 4;
    const slot =
      l.world_x != null && l.world_z != null
        ? { x: Number(l.world_x), z: Number(l.world_z) }
        : {
            x: ((i % cols) - (cols - 1) / 2) * 4.2,
            z: (Math.floor(i / cols) - 1) * 4.2,
          };
    return {
      id: l.id,
      title: l.title,
      price: Number(l.price),
      category: l.category ?? null,
      stock: l.stock,
      status: l.status,
      x: slot.x,
      z: slot.z,
      seller_name: l.seller?.name ?? null,
      seller_id: l.seller_agent_id,
    };
  });

  const stallById = new Map(stalls.map((s) => [s.id, s]));

  const agents: WorldAgent[] = opts.agents.map((a) => {
    const activity =
      (a.world_activity as WorldActivity) ||
      activityForAgent(a, negotiatingIds);
    const targetStallId = buyerToListing.get(a.id) ?? null;
    let slot =
      a.world_x != null && a.world_z != null
        ? { x: Number(a.world_x), z: Number(a.world_z) }
        : slotFromId(a.id, 5, 3.4);

    if (activity === "negotiating" && targetStallId && stallById.has(targetStallId)) {
      const st = stallById.get(targetStallId)!;
      slot = { x: st.x + 1.4, z: st.z + 1.1 };
    } else if (activity === "jury") {
      slot = { x: ((a.id.charCodeAt(0) % 5) - 2) * 1.2, z: 9 };
    }

    return {
      id: a.id,
      name: a.name,
      role: resolveRole(a.policy),
      status: a.status,
      activity,
      x: slot.x,
      z: slot.z,
      budget: Number(a.budget),
      spent: Number(a.spent ?? 0),
      reputation: Number(a.reputation ?? 50),
      goal: a.goal ?? a.description ?? null,
      target_stall_id: targetStallId,
    };
  });

  const links: WorldLink[] = [];
  for (const a of agents) {
    if (a.target_stall_id) {
      links.push({ agent_id: a.id, stall_id: a.target_stall_id });
    }
  }

  const deal_popups: WorldDealPopup[] = (opts.recentOrders || [])
    .slice(0, 8)
    .map((o) => {
      const st = stallById.get(o.listing_id);
      return {
        id: o.id,
        x: st?.x ?? 0,
        z: st?.z ?? 0,
        label: `£${Number(o.final_price).toFixed(0)} · Deal`,
        at: o.created_at,
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
    text: `${d.action_type || "action"}: ${String(
      d.payload?.message || d.payload?.type || ""
    ).slice(0, 80)}`,
  }));

  return {
    agents,
    stalls,
    events,
    links,
    deal_popups,
    open_negotiations: opts.openNegotiations.length,
    live: true,
  };
}
