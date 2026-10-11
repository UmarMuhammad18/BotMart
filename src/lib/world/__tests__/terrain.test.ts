import { describe, it, expect } from "vitest";
import { canGrow, fbm, heightAt, noise2, onRoad, pathAmount, seeded, ZONES } from "../terrain";
import { COURT_POS, VILLAGE } from "../districts";

describe("terrain", () => {
  it("noise is deterministic and bounded", () => {
    for (let i = 0; i < 200; i++) {
      const x = i * 0.37;
      const y = i * 1.13;
      expect(noise2(x, y)).toBe(noise2(x, y));
      expect(noise2(x, y)).toBeGreaterThanOrEqual(0);
      expect(noise2(x, y)).toBeLessThanOrEqual(1);
      expect(fbm(x, y)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the village floor flat and raises hills beyond it", () => {
    expect(Math.abs(heightAt(VILLAGE.cx, VILLAGE.cz))).toBeLessThan(0.01);
    // cottages stand on level ground
    const atRing = heightAt(VILLAGE.cx + VILLAGE.ringRadius, VILLAGE.cz);
    expect(Math.abs(atRing)).toBeLessThan(0.15);
    expect(heightAt(VILLAGE.cx + ZONES.hillRadius, VILLAGE.cz)).toBeGreaterThan(3);
  });

  it("marks the ring road and footpaths, and keeps grass off them", () => {
    const home = { x: VILLAGE.cx + VILLAGE.ringRadius, z: VILLAGE.cz, rot: -Math.PI / 2 };
    const roadPoint = { x: VILLAGE.cx + ZONES.roadRadius, z: VILLAGE.cz };
    expect(onRoad(roadPoint.x, roadPoint.z)).toBe(true);
    expect(pathAmount(roadPoint.x, roadPoint.z, [home])).toBeCloseTo(1);
    // the footpath between road and door
    expect(pathAmount(VILLAGE.cx + 21.8, VILLAGE.cz, [home])).toBeGreaterThan(0.9);
    expect(canGrow(VILLAGE.cx + 21.8, VILLAGE.cz, [home], COURT_POS)).toBe(false);
    // open meadow beyond the cottages
    expect(canGrow(VILLAGE.cx + 31, VILLAGE.cz + 9, [home], COURT_POS)).toBe(true);
  });

  it("seeded scatter repeats", () => {
    const a = seeded(42);
    const b = seeded(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
