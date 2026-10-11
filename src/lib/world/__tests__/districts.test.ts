import { describe, it, expect } from "vitest";
import { categoryKey, COURT_POS, layoutDistricts, VILLAGE } from "../districts";

const L = (id: string, category: string | null, seller = "S1") => ({
  id,
  category,
  seller_agent_id: seller,
});

describe("layoutDistricts", () => {
  it("groups stalls by category, biggest district first", () => {
    const { districts, stallPos } = layoutDistricts(
      [L("a", "software"), L("b", "electronics"), L("c", "Electronics"), L("d", null)],
      []
    );
    expect(districts.map((d) => d.id)).toEqual(["electronics", "general", "software"]);
    // Same-district stalls sit inside that district's plate
    const e = districts[0];
    for (const id of ["b", "c"]) {
      const p = stallPos.get(id)!;
      expect(Math.abs(p.x - e.x)).toBeLessThan(e.w / 2);
      expect(Math.abs(p.z - e.z)).toBeLessThan(e.d / 2);
    }
  });

  it.each([1, 4, 5, 9, 14])("never overlaps plates or walls (%i stalls each)", (n) => {
    const listings = ["electronics", "software", "compute", "data", "toys", "books"].flatMap(
      (c) => Array.from({ length: n }, (_, j) => L(`${c}${j}`, c))
    );
    const { districts } = layoutDistricts(listings, []);
    for (const a of districts)
      for (const b of districts) {
        if (a === b) continue;
        const apart =
          Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.z - b.z) >= (a.d + b.d) / 2;
        expect(apart, `${a.id} overlaps ${b.id}`).toBe(true);
      }
    for (const d of districts) expect(Math.abs(d.x) + d.w / 2).toBeLessThan(16);
  });

  it("folds overflow categories into General", () => {
    const cats = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const { districts, districtOf } = layoutDistricts(
      cats.map((c, i) => L(`l${i}`, c)),
      []
    );
    expect(districts).toHaveLength(6);
    expect(districts.at(-1)!.id).toBe("general");
    expect(districtOf("h")).toBe("general");
  });

  it("puts every agent's cottage on the ring, facing the square, clear of the court", () => {
    const agents = Array.from({ length: 9 }, (_, i) => ({ id: `a${i}` }));
    const { buildings, homePos } = layoutDistricts([L("x", "data", "a0")], agents);
    expect(buildings.size).toBe(9);
    const list = [...buildings.values()];
    for (const b of list) {
      const r = Math.hypot(b.x - VILLAGE.cx, b.z - VILLAGE.cz);
      expect(r).toBeCloseTo(VILLAGE.ringRadius);
      // front (+z rotated by rot) points back toward the centre
      const fx = Math.sin(b.rot);
      const fz = Math.cos(b.rot);
      expect(fx * (VILLAGE.cx - b.x) + fz * (VILLAGE.cz - b.z)).toBeGreaterThan(0);
      expect(Math.hypot(b.x - COURT_POS.x, b.z - COURT_POS.z)).toBeGreaterThan(8);
    }
    for (const a of list)
      for (const b of list) if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(7);
    // the idle spot is the porch, between the cottage and the square
    const h = homePos.get("a0")!;
    expect(Math.hypot(h.x - VILLAGE.cx, h.z - VILLAGE.cz)).toBeCloseTo(VILLAGE.ringRadius - VILLAGE.porch);
  });

  it("puts a seller's cottage on the side of the ring nearest its district", () => {
    const listings = [L("e1", "electronics", "seller"), L("e2", "electronics", "seller"), L("s1", "software", "other")];
    const agents = ["seller", "b1", "b2", "b3", "b4", "b5"].map((id) => ({ id }));
    const { buildings, districts } = layoutDistricts(listings, agents);
    const e = districts.find((d) => d.id === "electronics")!;
    const toDistrict = (id: string) => {
      const b = buildings.get(id)!;
      return Math.hypot(b.x - e.x, b.z - e.z);
    };
    for (const other of ["b1", "b2", "b3", "b4", "b5"]) {
      expect(toDistrict("seller")).toBeLessThanOrEqual(toDistrict(other));
    }
  });

  it("respects explicit world coordinates", () => {
    const { stallPos, homePos } = layoutDistricts(
      [{ ...L("a", "data"), world_x: 1, world_z: 2 }],
      [{ id: "x", world_x: 3, world_z: 4 }]
    );
    expect(stallPos.get("a")).toEqual({ x: 1, z: 2 });
    expect(homePos.get("x")).toEqual({ x: 3, z: 4 });
  });

  it("normalises category keys", () => {
    expect(categoryKey("  Electronics ")).toBe("electronics");
    expect(categoryKey(null)).toBe("general");
  });
});
