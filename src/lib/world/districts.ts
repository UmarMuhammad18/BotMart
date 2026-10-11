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

export type DistrictLayout = {
  districts: District[];
  stallPos: Map<string, { x: number; z: number }>;
  /** Home station for each agent id. */
  homePos: Map<string, { x: number; z: number }>;
  /** Category key → district id (for scouting routes). */
  districtOf: (category: string | null | undefined) => string;
};

const KNOWN: Record<string, { label: string; color: string }> = {
  electronics: { label: "Electronics", color: "#22d3ee" },
  software: { label: "Software", color: "#a78bfa" },
  compute: { label: "Compute", color: "#f59e0b" },
  data: { label: "Data", color: "#42d886" },
  general: { label: "General", color: "#94a3b8" },
};
const EXTRA_COLORS = ["#f472b6", "#60a5fa", "#facc15", "#fb7185"];

/** Two rows of three district slots, clear of the side walls (x = ±16). */
const SLOTS: [number, number][] = [
  [-10, -8],
  [0, -8],
  [10, -8],
  [-10, 2.5],
  [0, 2.5],
  [10, 2.5],
];
const BACK_ROW_Z = -8;
/** A plate must fit its slot: 10 wide, 10.5 deep (slot pitch). */
const MAX_DEPTH = 10.3;
const PAD_W = 1.4;
const PAD_D = 1.2;
/** Buyer-only agents live on the plaza between the market and the court. */
const PLAZA_Z = 10.8;

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
  const perDistrict = new Map<string, string[]>();
  const plaza: string[] = [];
  for (const a of agents) {
    if (a.world_x != null && a.world_z != null) {
      homePos.set(a.id, { x: Number(a.world_x), z: Number(a.world_z) });
      continue;
    }
    const d = sellerDistrict.get(a.id);
    if (d) {
      if (!perDistrict.has(d)) perDistrict.set(d, []);
      perDistrict.get(d)!.push(a.id);
    } else {
      plaza.push(a.id);
    }
  }
  for (const [dId, ids] of perDistrict) {
    const dist = districts.find((x) => x.id === dId)!;
    // Back-row districts keep stations behind them; front-row districts face
    // the plaza (the aisle between the rows is left for walking)
    const edge =
      dist.z === BACK_ROW_Z ? dist.z - dist.d / 2 - 0.9 : dist.z + dist.d / 2 + 0.9;
    ids.forEach((id, k) => {
      homePos.set(id, {
        x: dist.x + (k - (ids.length - 1) / 2) * 2.2,
        z: edge,
      });
    });
  }
  plaza.forEach((id, k) => {
    homePos.set(id, { x: (k - (plaza.length - 1) / 2) * 3, z: PLAZA_Z });
  });

  return {
    districts,
    stallPos,
    homePos,
    districtOf: (category) => alias.get(categoryKey(category)) ?? "general",
  };
}
