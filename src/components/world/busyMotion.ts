import type { WorldAgent, WorldStall } from "@/lib/types";

/** Deterministic wander waypoint for an idle agent at time t (seconds). */
export function wanderTarget(
  agent: WorldAgent,
  t: number,
  stalls: WorldStall[]
): { x: number; z: number } {
  // Seed from id
  let h = 0;
  for (let i = 0; i < agent.id.length; i++) h = (h * 33 + agent.id.charCodeAt(i)) | 0;
  const phase = (Math.abs(h) % 1000) / 1000;
  const speed = 0.12 + (Math.abs(h) % 7) * 0.02;

  if (agent.activity === "negotiating" && agent.target_stall_id) {
    const st = stalls.find((s) => s.id === agent.target_stall_id);
    if (st) {
      // Pace in a small arc in front of the stall
      const ang = t * 0.8 + phase * Math.PI * 2;
      return {
        x: st.x + Math.cos(ang) * 1.35,
        z: st.z + 1.2 + Math.sin(ang) * 0.4,
      };
    }
  }

  if (agent.activity === "jury") {
    const slot = Math.abs(h) % 5;
    const baseX = (slot - 2) * 1.15;
    // Subtle shift on the court dais (centred at z = 16)
    return {
      x: baseX + Math.sin(t * 0.4 + phase) * 0.15,
      z: 15.4 + Math.cos(t * 0.35 + phase) * 0.1,
    };
  }

  if (agent.activity === "scouting" && stalls.length > 0) {
    // Patrol between stalls
    const idx =
      Math.floor((t * speed + phase * stalls.length) % stalls.length + stalls.length) %
      stalls.length;
    const st = stalls[idx];
    const next = stalls[(idx + 1) % stalls.length];
    const frac = ((t * speed + phase * stalls.length) % 1 + 1) % 1;
    return {
      x: st.x + (next.x - st.x) * frac + 1.1,
      z: st.z + (next.z - st.z) * frac + 1.0,
    };
  }

  // Idle: figure-8 / orbit around home slot
  const ang = t * speed + phase * Math.PI * 2;
  const r = 1.2 + (Math.abs(h) % 5) * 0.15;
  return {
    x: agent.x + Math.cos(ang) * r * 0.35,
    z: agent.z + Math.sin(ang * 0.9) * r * 0.35,
  };
}
