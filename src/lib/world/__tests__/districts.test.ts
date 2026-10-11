import { describe, it, expect } from "vitest";
import { categoryKey, layoutDistricts } from "../districts";

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

  it("homes sellers in their main district and buyers on the plaza", () => {
    const { homePos, districts } = layoutDistricts(
      [L("a", "data", "seller"), L("b", "data", "seller"), L("c", "software", "seller")],
      [{ id: "seller" }, { id: "buyer" }]
    );
    const data = districts.find((d) => d.id === "data")!;
    expect(homePos.get("seller")!.x).toBeCloseTo(data.x);
    // Station sits just outside its own district plate
    expect(Math.abs(homePos.get("seller")!.z - data.z)).toBeGreaterThan(data.d / 2);
    expect(homePos.get("buyer")!.z).toBeGreaterThan(8);
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
