/**
 * Market districts: listings are grouped by category into neighbourhoods so
 * agents' walking routes mean something (a gadget buyer heads to the
 * Electronics quarter; sellers keep their station in their own district).
 *
 * Pure layout math, no rendering — see __tests__/districts.test.ts.
 */

export type District = {
  id: string;
  label: string;
  color: string;
  /** Plate centre and size on the floor (world units). */
  x: number;
  z: number;
  w: number;
  d: number;
};

type ListingLike = {
  id: string;
  category?: string | null;
  seller_agent_id?: string | null;
  world_x?: number | null;
  world_z?: number | null;
};

type AgentLike = { id: string; world_x?: number | null; world_z?: number | null };

/**
 * Village geometry: the market (districts + stalls) sits in the middle; each
 * agent's cottage stands on a ring around it, facing the square. The court
 * hall closes the ring on the +z side.
 */
export const VILLAGE = {
  cx: 0,
  cz: -2.5,
  ringRadius: 25,
  /** Agent's idle spot: on the porch, this far in front of the cottage. */
  porch: 3.4,
  courtAngle: Math.PI / 2,
  /** No cottages within this angle either side of the court. */
  courtGap: 0.42,
} as const;

export const COURT_POS = {
  x: VILLAGE.cx + Math.cos(VILLAGE.courtAngle) * VILLAGE.ringRadius,
  z: VILLAGE.cz + Math.sin(VILLAGE.courtAngle) * VILLAGE.ringRadius,
};

/** The court hall's y-rotation: its portico faces the square. */
export const COURT_ROT = Math.atan2(VILLAGE.cx - COURT_POS.x, VILLAGE.cz - COURT_POS.z);

/**
 * Where the two parties to a court case stand: at the foot of the steps,
 * either side of centre, facing the hall. `side` -1 = buyer, 1 = seller.
 */
export function courtSpot(side: -1 | 1) {
  const lx = side * 1.3;
  const lz = 4.7;
  const c = Math.cos(COURT_ROT);
  const s = Math.sin(COURT_ROT);
  const x = COURT_POS.x + lx * c + lz * s;
  const z = COURT_POS.z - lx * s + lz * c;
  // Face the hall's centre
  return { x, z, faceX: COURT_POS.x + lx * c, faceZ: COURT_POS.z - lx * s };
}

export type Building = { x: number; z: number; rot: number };

export type DistrictLayout = {
  districts: District[];
  stallPos: Map<string, { x: number; z: number }>;
  /** Each agent's idle spot (on its porch). */
  homePos: Map<string, { x: number; z: number }>;
  /** Each agent's cottage: centre and y-rotation (front faces the square). */
  buildings: Map<string, Building>;
  /** Category key → district id (for scouting routes). */
  districtOf: (category: string | null | undefined) => string;
};

/** Natural market-cloth tones, leaning green, that sit well in the village. */
const KNOWN: Record<string, { label: string; color: string }> = {
  electronics: { label: "Electronics", color: "#2f8f86" },
  software: { label: "Software", color: "#3f9a5a" },
  compute: { label: "Compute", color: "#c79a3a" },
  data: { label: "Data", color: "#7f9a3c" },
  general: { label: "General", color: "#8aa68e" },
};
const EXTRA_COLORS = ["#b8643f", "#7d5a7a", "#4f7fa0", "#a0864a"];

/** Two rows of three district slots, clear of the side walls (x = ±16). */
const SLOTS: [number, number][] = [
  [-10, -8],
  [0, -8],
  [10, -8],
  [-10, 2.5],
  [0, 2.5],
  [10, 2.5],
];
/** A plate must fit its slot: 10 wide, 10.5 deep (slot pitch). */
const MAX_DEPTH = 10.3;
const PAD_W = 1.4;
const PAD_D = 1.2;

export function categoryKey(category: string | null | undefined) {
  const c = (category || "").trim().toLowerCase();
  return c || "general";
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

export function layoutDistricts(
  listings: ListingLike[],
  agents: AgentLike[]
): DistrictLayout {
  // Group by category, biggest districts first (stable by name)
  const groups = new Map<string, ListingLike[]>();
  for (const l of listings) {
    const k = categoryKey(l.category);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(l);
  }
  let keys = [...groups.keys()].sort(
    (a, b) => groups.get(b)!.length - groups.get(a)!.length || a.localeCompare(b)
  );

  // More categories than slots → the smallest ones share "General"
  if (keys.length > SLOTS.length) {
    const keep = keys.filter((k) => k !== "general").slice(0, SLOTS.length - 1);
    const merged = keys
      .filter((k) => !keep.includes(k))
      .flatMap((k) => groups.get(k)!);
    for (const k of keys) if (!keep.includes(k)) groups.delete(k);
    groups.set("general", merged);
    keys = [...keep, "general"];
  }

  const districts: District[] = [];
  const stallPos = new Map<string, { x: number; z: number }>();
  const alias = new Map<string, string>();
  let extra = 0;

  keys.forEach((key, i) => {
    const [cx, cz] = SLOTS[i];
    const items = groups.get(key)!;
    const cols = items.length > 4 ? 3 : Math.min(2, items.length);
    const rows = Math.ceil(items.length / cols);
    const dx = cols === 3 ? 2.8 : 3.3;
    // Big districts squeeze rows rather than spill into the next slot
    const dz = Math.min(3.4, (MAX_DEPTH - PAD_D) / rows);
    const known = KNOWN[key];
    districts.push({
      id: key,
      label: known?.label ?? titleCase(key),
      color: known?.color ?? EXTRA_COLORS[extra++ % EXTRA_COLORS.length],
      x: cx,
      z: cz,
      w: cols * dx + PAD_W,
      d: rows * dz + PAD_D,
    });
    items.forEach((l, j) => {
      alias.set(categoryKey(l.category), key);
      if (l.world_x != null && l.world_z != null) {
        stallPos.set(l.id, { x: Number(l.world_x), z: Number(l.world_z) });
        return;
      }
      const col = j % cols;
      const row = Math.floor(j / cols);
      stallPos.set(l.id, {
        x: cx + (col - (cols - 1) / 2) * dx,
        z: cz + (row - (rows - 1) / 2) * dz,
      });
    });
  });

  // Sellers: station at the back edge of the district they list most in
  const sellerDistrict = new Map<string, string>();
  const counts = new Map<string, Map<string, number>>();
  for (const l of listings) {
    if (!l.seller_agent_id) continue;
    const d = alias.get(categoryKey(l.category)) ?? "general";
    const m = counts.get(l.seller_agent_id) ?? new Map<string, number>();
    m.set(d, (m.get(d) ?? 0) + 1);
    counts.set(l.seller_agent_id, m);
  }
  for (const [agentId, m] of counts) {
    const best = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    sellerDistrict.set(agentId, best[0]);
  }

  const homePos = new Map<string, { x: number; z: number }>();
  const buildings = new Map<string, Building>();
  const { cx, cz, ringRadius: R, porch, courtAngle, courtGap } = VILLAGE;

  const place = (id: string, theta: number) => {
    const bx = cx + Math.cos(theta) * R;
    const bz = cz + Math.sin(theta) * R;
    // rotation.y so the cottage's local +z (its front) points at the square
    const rot = Math.atan2(cx - bx, cz - bz);
    buildings.set(id, { x: bx, z: bz, rot });
    homePos.set(id, {
      x: cx + Math.cos(theta) * (R - porch),
      z: cz + Math.sin(theta) * (R - porch),
    });
  };

  const ringAgents: { id: string; pref: number | null }[] = [];
  for (const a of agents) {
    if (a.world_x != null && a.world_z != null) {
      // Explicit coordinates: that's the porch spot; the cottage stands behind it
      const x = Number(a.world_x);
      const z = Number(a.world_z);
      const out = Math.atan2(z - cz, x - cx);
      homePos.set(a.id, { x, z });
      buildings.set(a.id, {
        x: x + Math.cos(out) * porch,
        z: z + Math.sin(out) * porch,
        rot: Math.atan2(cx - x, cz - z),
      });
      continue;
    }
    const d = sellerDistrict.get(a.id);
    const dist = d ? districts.find((x) => x.id === d) : undefined;
    ringAgents.push({ id: a.id, pref: dist ? Math.atan2(dist.z - cz, dist.x - cx) : null });
  }

  // Evenly spaced slots around the ring, leaving a gap for the court
  const n = ringAgents.length;
  const span = Math.PI * 2 - courtGap * 2;
  const slots = Array.from({ length: n }, (_, i) =>
    courtAngle + courtGap + (n === 1 ? span / 2 : (i + 0.5) * (span / n))
  );
  const free = new Set(slots.map((_, i) => i));
  const angDist = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

  // Sellers take the free slot nearest their district; everyone else fills in
  const sellersFirst = [...ringAgents].sort(
    (a, b) => (a.pref == null ? 1 : 0) - (b.pref == null ? 1 : 0) || a.id.localeCompare(b.id)
  );
  for (const agent of sellersFirst) {
    let best = -1;
    for (const i of free) {
      if (best === -1) best = i;
      else if (agent.pref != null && angDist(slots[i], agent.pref) < angDist(slots[best], agent.pref)) best = i;
    }
    free.delete(best);
    place(agent.id, slots[best]);
  }

  return {
    districts,
    stallPos,
    homePos,
    buildings,
    districtOf: (category) => alias.get(categoryKey(category)) ?? "general",
  };
}
