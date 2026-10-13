import { COURT_POS, COURT_ROT, VILLAGE } from "@/lib/world/districts";
import { POND } from "@/lib/world/terrain";
import { buildNavGrid, type NavGrid, type Obstacle } from "@/lib/world/pathfind";

/**
 * The village's solid things, as obstacles for path finding. Sizes match the
 * meshes in components/world/village (stall counter + sign, cottage walls
 * and footing, court steps, statue plinth, fountain basin, pond). Porches
 * and the spots in front of stalls and the court stay walkable: that's where
 * agents stand.
 */
export function villageObstacles(
  stalls: { x: number; z: number }[],
  buildings: { x: number; z: number; rot: number }[]
): Obstacle[] {
  const out: Obstacle[] = [];
  for (const s of stalls) out.push({ kind: "rect", x: s.x - 0.1, z: s.z, hw: 1.45, hd: 0.8, rot: 0 });
  for (const b of buildings) out.push({ kind: "rect", x: b.x, z: b.z, hw: 2.55, hd: 2.2, rot: b.rot });
  out.push({ kind: "rect", x: COURT_POS.x, z: COURT_POS.z, hw: 4.6, hd: 3.8, rot: COURT_ROT });
  // The scales-of-justice statue to one side of the steps (local -6.2, 2.2)
  const c = Math.cos(COURT_ROT);
  const s = Math.sin(COURT_ROT);
  out.push({ kind: "circle", x: COURT_POS.x - 6.2 * c + 2.2 * s, z: COURT_POS.z + 6.2 * s + 2.2 * c, r: 0.95 });
  out.push({ kind: "circle", x: VILLAGE.cx, z: VILLAGE.cz, r: 1.75 });
  out.push({ kind: "ellipse", x: POND.x, z: POND.z, rx: POND.rx, rz: POND.rz });
  return out;
}

const HALF = 62;

export function villageNavGrid(stalls: { x: number; z: number }[], buildings: { x: number; z: number; rot: number }[]): NavGrid {
  return buildNavGrid(villageObstacles(stalls, buildings), {
    minX: VILLAGE.cx - HALF,
    minZ: VILLAGE.cz - HALF,
    maxX: VILLAGE.cx + HALF,
    maxZ: VILLAGE.cz + HALF,
  });
}
