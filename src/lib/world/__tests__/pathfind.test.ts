import { describe, it, expect } from "vitest";
import { buildNavGrid, clearLine, findPath, isBlocked, type Vec2 } from "../pathfind";
import { villageNavGrid } from "../navigation";
import { courtSpot, VILLAGE } from "../districts";

const bounds = { minX: -20, minZ: -20, maxX: 20, maxZ: 20 };

/** Every leg of the route must be walkable. */
function walkable(g: ReturnType<typeof buildNavGrid>, from: Vec2, path: Vec2[]) {
  let a = from;
  for (const p of path) {
    if (!clearLine(g, a, p)) return false;
    a = p;
  }
  return true;
}

describe("findPath", () => {
  it("goes straight when nothing is in the way", () => {
    const g = buildNavGrid([], bounds);
    expect(findPath(g, { x: -5, z: 0 }, { x: 5, z: 0 })).toEqual([{ x: 5, z: 0 }]);
  });

  it("walks around a wall instead of through it", () => {
    const wall = { kind: "rect" as const, x: 0, z: 0, hw: 0.5, hd: 6, rot: 0 };
    const g = buildNavGrid([wall], bounds);
    const from = { x: -5, z: 0 };
    const to = { x: 5, z: 0 };
    expect(clearLine(g, from, to)).toBe(false);
    const path = findPath(g, from, to);
    expect(path.length).toBeGreaterThan(1);
    expect(path[path.length - 1]).toEqual(to);
    expect(walkable(g, from, path)).toBe(true);
    // String-pulled: a handful of corners, not a cell-by-cell staircase
    expect(path.length).toBeLessThan(6);
  });

  it("moves a goal inside an obstacle to the nearest open spot", () => {
    const box = { kind: "circle" as const, x: 0, z: 0, r: 2 };
    const g = buildNavGrid([box], bounds);
    const path = findPath(g, { x: -8, z: 0 }, { x: 0, z: 0 });
    expect(path.length).toBeGreaterThan(0);
    expect(isBlocked(g, path[path.length - 1])).toBe(false);
  });

  it("returns no route when the goal is sealed off", () => {
    const ring = Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return { kind: "circle" as const, x: Math.cos(a) * 6, z: Math.sin(a) * 6, r: 0.6 };
    });
    const g = buildNavGrid([...ring, { kind: "circle", x: 0, z: 0, r: 0.1 }], bounds);
    expect(findPath(g, { x: -15, z: 0 }, { x: 0, z: 0.9 })).toEqual([]);
  });
});

describe("village navigation", () => {
  const stalls = [{ x: VILLAGE.cx + 6, z: VILLAGE.cz }];
  const g = villageNavGrid(stalls, []);

  it("keeps the spots agents stand on walkable", () => {
    expect(isBlocked(g, { x: stalls[0].x + 0.95, z: stalls[0].z + 1.6 })).toBe(false); // buyer's spot
    expect(isBlocked(g, courtSpot(-1))).toBe(false);
    expect(isBlocked(g, courtSpot(1))).toBe(false);
  });

  it("blocks the fountain and stalls", () => {
    expect(isBlocked(g, { x: VILLAGE.cx, z: VILLAGE.cz })).toBe(true);
    expect(isBlocked(g, stalls[0])).toBe(true);
  });
});
