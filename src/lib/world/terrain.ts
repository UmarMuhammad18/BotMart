import { VILLAGE } from "@/lib/world/districts";

/**
 * Procedural landscape for the village: a flat valley floor where the market
 * and cottages stand, rolling hills beyond, a dirt ring road between market
 * and porches, and short paths up to each cottage. Pure functions, shared by
 * the terrain mesh, grass and tree placement so nothing grows on a path.
 */

/* ── Noise ─────────────────────────────────────────────────────────────── */

function hash(x: number, y: number) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

/** Value noise in [0, 1]. */
export function noise2(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

/** Fractal noise in roughly [0, 1]. */
export function fbm(x: number, y: number, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** Deterministic pseudo-random in [0, 1) for seeded scatter. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ── Village zones ─────────────────────────────────────────────────────── */

export const ZONES = {
  /** Cobbled square: runs right up to the inner edge of the ring road. */
  marketRadius: 18.45,
  roadRadius: 19.7,
  roadHalfWidth: 1.25,
  flatRadius: 33,
  hillRadius: 72,
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function radiusFromCentre(x: number, z: number) {
  return Math.hypot(x - VILLAGE.cx, z - VILLAGE.cz);
}

/** Ground height: flat valley, hills rising beyond the cottages. */
export function heightAt(x: number, z: number) {
  const r = radiusFromCentre(x, z);
  const rise = smoothstep(ZONES.flatRadius, ZONES.hillRadius, r);
  const hills = rise * (3.5 + fbm(x * 0.035, z * 0.035) * 7.5);
  const ripple = (fbm(x * 0.18 + 40, z * 0.18) - 0.5) * 0.12 * smoothstep(ZONES.roadRadius + 2, ZONES.flatRadius, r);
  // Pond: a shallow bowl so the water sits below the banks
  const pdx = (x - POND.x) / (POND.rx + 1.5);
  const pdz = (z - POND.z) / (POND.rz + 1.5);
  const bowl = Math.max(0, 1 - (pdx * pdx + pdz * pdz));
  return (hills + ripple) * (1 - bowl) - bowl * 0.55;
}

export function onRoad(x: number, z: number) {
  return Math.abs(radiusFromCentre(x, z) - ZONES.roadRadius) < ZONES.roadHalfWidth;
}

export function inMarket(x: number, z: number) {
  return radiusFromCentre(x, z) < ZONES.marketRadius;
}

/** Distance from a point to the segment a-b (for footpaths). */
function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax;
  const vz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

export type Footprint = { x: number; z: number; rot: number };

/**
 * How much of a point is path (0..1): the ring road, plus a footpath from
 * the road to each cottage door.
 */
export function pathAmount(x: number, z: number, homes: Footprint[]) {
  const r = radiusFromCentre(x, z);
  let d = Math.abs(r - ZONES.roadRadius) - ZONES.roadHalfWidth;
  for (const h of homes) {
    const door = { x: h.x + Math.sin(h.rot) * 2.6, z: h.z + Math.cos(h.rot) * 2.6 };
    const ang = Math.atan2(h.z - VILLAGE.cz, h.x - VILLAGE.cx);
    const road = { x: VILLAGE.cx + Math.cos(ang) * ZONES.roadRadius, z: VILLAGE.cz + Math.sin(ang) * ZONES.roadRadius };
    d = Math.min(d, segDist(x, z, door.x, door.z, road.x, road.z) - 0.75);
  }
  return 1 - smoothstep(0, 0.6, d);
}

/** A pond in the meadow beyond the cottages. */
export const POND = {
  x: VILLAGE.cx + Math.cos(3.55) * 36,
  z: VILLAGE.cz + Math.sin(3.55) * 36,
  rx: 6.2,
  rz: 4.4,
};

export function inPond(x: number, z: number, margin = 0) {
  const dx = (x - POND.x) / (POND.rx + margin);
  const dz = (z - POND.z) / (POND.rz + margin);
  return dx * dx + dz * dz < 1;
}

/** True where vegetation may grow. */
export function canGrow(x: number, z: number, homes: Footprint[], court: { x: number; z: number }) {
  if (inMarket(x, z)) return false;
  if (pathAmount(x, z, homes) > 0.05) return false;
  for (const h of homes) if (Math.hypot(x - h.x, z - h.z) < 4.6) return false;
  if (Math.hypot(x - court.x, z - court.z) < 7.5) return false;
  if (inPond(x, z, 0.8)) return false;
  return true;
}
