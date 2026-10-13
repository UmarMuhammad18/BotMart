/**
 * Walking routes for the village. A coarse grid marks where robots can't go
 * (stalls, cottages, the fountain, the court hall and its statue, the pond);
 * A* finds a route around them and string-pulling trims it to a few
 * waypoints. Pure and deterministic, so it's unit tested; the scene only
 * plans when the straight line to a goal is blocked.
 */
export type Vec2 = { x: number; z: number };

export type Obstacle =
  | { kind: "rect"; x: number; z: number; hw: number; hd: number; rot: number }
  | { kind: "circle"; x: number; z: number; r: number }
  | { kind: "ellipse"; x: number; z: number; rx: number; rz: number };

export type NavGrid = {
  minX: number;
  minZ: number;
  cell: number;
  cols: number;
  rows: number;
  blocked: Uint8Array;
};

/** How far robots keep from obstacles (their body radius). */
const CLEARANCE = 0.35;

function inside(o: Obstacle, x: number, z: number, pad: number) {
  const dx = x - o.x;
  const dz = z - o.z;
  if (o.kind === "circle") return dx * dx + dz * dz <= (o.r + pad) * (o.r + pad);
  if (o.kind === "ellipse") {
    const a = dx / (o.rx + pad);
    const b = dz / (o.rz + pad);
    return a * a + b * b <= 1;
  }
  // Into the rectangle's local frame (three.js y-rotation)
  const c = Math.cos(o.rot);
  const s = Math.sin(o.rot);
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  return Math.abs(lx) <= o.hw + pad && Math.abs(lz) <= o.hd + pad;
}

export function buildNavGrid(
  obstacles: Obstacle[],
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number },
  cell = 0.5
): NavGrid {
  const cols = Math.ceil((bounds.maxX - bounds.minX) / cell);
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / cell);
  const blocked = new Uint8Array(cols * rows);
  for (const o of obstacles) {
    // Only visit cells near the obstacle
    const reach =
      (o.kind === "circle" ? o.r : o.kind === "ellipse" ? Math.max(o.rx, o.rz) : Math.hypot(o.hw, o.hd)) + CLEARANCE + cell;
    const c0 = Math.max(0, Math.floor((o.x - reach - bounds.minX) / cell));
    const c1 = Math.min(cols - 1, Math.ceil((o.x + reach - bounds.minX) / cell));
    const r0 = Math.max(0, Math.floor((o.z - reach - bounds.minZ) / cell));
    const r1 = Math.min(rows - 1, Math.ceil((o.z + reach - bounds.minZ) / cell));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const x = bounds.minX + (c + 0.5) * cell;
        const z = bounds.minZ + (r + 0.5) * cell;
        if (inside(o, x, z, CLEARANCE)) blocked[r * cols + c] = 1;
      }
    }
  }
  return { minX: bounds.minX, minZ: bounds.minZ, cell, cols, rows, blocked };
}

const cellOf = (g: NavGrid, p: Vec2) => ({
  c: Math.floor((p.x - g.minX) / g.cell),
  r: Math.floor((p.z - g.minZ) / g.cell),
});
const centre = (g: NavGrid, c: number, r: number): Vec2 => ({
  x: g.minX + (c + 0.5) * g.cell,
  z: g.minZ + (r + 0.5) * g.cell,
});

export function isBlocked(g: NavGrid, p: Vec2) {
  const { c, r } = cellOf(g, p);
  if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return true;
  return g.blocked[r * g.cols + c] === 1;
}

/** True if walking straight from a to b never enters a blocked cell. */
export function clearLine(g: NavGrid, a: Vec2, b: Vec2) {
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(d / (g.cell * 0.5)));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (isBlocked(g, { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false;
  }
  return true;
}

/** Nearest open cell to p (spiral search), or null if none nearby. */
function nearestOpen(g: NavGrid, p: Vec2, maxRing = 12) {
  const { c, r } = cellOf(g, p);
  for (let ring = 0; ring <= maxRing; ring++) {
    let best: { c: number; r: number; d: number } | null = null;
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const cc = c + dc;
        const rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= g.cols || rr >= g.rows || g.blocked[rr * g.cols + cc]) continue;
        const d = dc * dc + dr * dr;
        if (!best || d < best.d) best = { c: cc, r: rr, d };
      }
    }
    if (best) return best;
  }
  return null;
}

/** Binary min-heap keyed by f-score. */
class Heap {
  private items: number[] = [];
  constructor(private score: Float32Array) {}
  get size() {
    return this.items.length;
  }
  push(i: number) {
    const a = this.items;
    a.push(i);
    let k = a.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (this.score[a[p]] <= this.score[a[k]]) break;
      [a[p], a[k]] = [a[k], a[p]];
      k = p;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < a.length && this.score[a[l]] < this.score[a[m]]) m = l;
        if (r < a.length && this.score[a[r]] < this.score[a[m]]) m = r;
        if (m === k) break;
        [a[m], a[k]] = [a[k], a[m]];
        k = m;
      }
    }
    return top;
  }
}

/**
 * Waypoints from `from` to `to` (excluding `from`), going around obstacles.
 * Straight line if it's clear; [] if there's no route. A goal inside an
 * obstacle is moved to the nearest open spot.
 */
export function findPath(g: NavGrid, from: Vec2, to: Vec2, maxExpansions = 20000): Vec2[] {
  if (clearLine(g, from, to)) return [to];

  const start = isBlocked(g, from) ? nearestOpen(g, from) : cellOf(g, from);
  const goal = isBlocked(g, to) ? nearestOpen(g, to) : cellOf(g, to);
  if (!start || !goal) return [];
  const goalPoint = isBlocked(g, to) ? centre(g, goal.c, goal.r) : to;

  const n = g.cols * g.rows;
  const gScore = new Float32Array(n).fill(Infinity);
  const fScore = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const s = start.r * g.cols + start.c;
  const t = goal.r * g.cols + goal.c;
  const h = (i: number) => {
    const dc = Math.abs((i % g.cols) - goal.c);
    const dr = Math.abs(Math.floor(i / g.cols) - goal.r);
    return Math.max(dc, dr) + (Math.SQRT2 - 1) * Math.min(dc, dr); // octile
  };
  gScore[s] = 0;
  fScore[s] = h(s);
  const open = new Heap(fScore);
  open.push(s);

  let expansions = 0;
  while (open.size) {
    const cur = open.pop();
    if (cur === t) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (++expansions > maxExpansions) return [];
    const cc = cur % g.cols;
    const cr = Math.floor(cur / g.cols);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue;
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc < 0 || nr < 0 || nc >= g.cols || nr >= g.rows) continue;
        const ni = nr * g.cols + nc;
        if (g.blocked[ni] || closed[ni]) continue;
        // No corner cutting through blocked cells
        if (dc && dr && (g.blocked[cr * g.cols + nc] || g.blocked[nr * g.cols + cc])) continue;
        const tentative = gScore[cur] + (dc && dr ? Math.SQRT2 : 1);
        if (tentative < gScore[ni]) {
          gScore[ni] = tentative;
          fScore[ni] = tentative + h(ni);
          came[ni] = cur;
          open.push(ni);
        }
      }
    }
  }
  if (came[t] === -1 && s !== t) return [];

  const cells: Vec2[] = [];
  for (let i = t; i !== -1 && i !== s; i = came[i]) cells.push(centre(g, i % g.cols, Math.floor(i / g.cols)));
  cells.reverse();
  cells[cells.length - 1] = goalPoint;
  return smooth(g, from, cells);
}

/** String-pull: keep only the waypoints needed to keep a clear line. */
function smooth(g: NavGrid, from: Vec2, pts: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  let anchor = from;
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !clearLine(g, anchor, pts[j])) j--;
    out.push(pts[j]);
    anchor = pts[j];
    i = j + 1;
  }
  return out;
}
