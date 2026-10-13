import { describe, it, expect } from "vitest";
import { WorldDirector, type Cue } from "../director";
import { courtSpot, COURT_POS } from "../districts";
import { detectTier, resolveSky } from "../options";
import type { WorldBeat } from "@/lib/types";

const stage = { stall: () => undefined, agentName: (id: string) => id };

const courtBeat: WorldBeat = {
  id: "c1",
  at: new Date().toISOString(),
  agent_id: "B",
  negotiation_id: null,
  buyer_id: "B",
  seller_id: "S",
  listing_id: null,
  role: null,
  type: "court",
  price: 60,
  message: "The court finds the deal fair (4 accept, 1 counter, 0 reject)",
};

const run = (d: WorldDirector, ms: number) => {
  for (let t = 0; t < ms; t += 50) d.tick(50);
};

describe("court scenes", () => {
  it("walks both parties to the court steps, hears the case, then rules", () => {
    const cues: Cue[] = [];
    const d = new WorldDirector(stage);
    d.setOnCue((c) => cues.push(c));
    d.pushLive([courtBeat]);
    run(d, 100);

    expect(d.placementFor("B")).toEqual(courtSpot(-1));
    expect(d.placementFor("S")).toEqual(courtSpot(1));
    expect(cues).toContain("step");

    run(d, 4300); // hearing: the seller speaks
    expect(d.bubbleFor("S")?.text).toMatch(/Your honour/);

    run(d, 2700); // verdict over the buyer, with the gavel
    expect(d.bubbleFor("B")?.text).toMatch(/^⚖ The court finds the deal fair/);
    expect(cues).toContain("gavel");
    expect(d.nowPlaying).toBe("Court · B v S");

    run(d, 5400); // case closed: both free to go home
    expect(d.placementFor("B")).toBeNull();
    expect(d.bubbleFor("B")).toBeNull();
  });

  it("puts the court spots in front of the hall, either side of centre", () => {
    const b = courtSpot(-1);
    const s = courtSpot(1);
    const db = Math.hypot(b.x - COURT_POS.x, b.z - COURT_POS.z);
    expect(db).toBeGreaterThan(4);
    expect(db).toBeLessThan(6);
    expect(Math.hypot(b.x - s.x, b.z - s.z)).toBeCloseTo(2.6, 5);
  });
});

describe("resolveSky", () => {
  const at = (h: number) => new Date(2026, 5, 1, h, 0);
  it("follows the theme by default", () => {
    expect(resolveSky("theme", "light")).toBe("day");
    expect(resolveSky("theme", "dark")).toBe("night");
  });
  it("follows the clock in real-time mode", () => {
    expect(resolveSky("realtime", "light", at(12))).toBe("day");
    expect(resolveSky("realtime", "light", at(19))).toBe("dusk");
    expect(resolveSky("realtime", "light", at(6))).toBe("dusk");
    expect(resolveSky("realtime", "light", at(23))).toBe("night");
    expect(resolveSky("realtime", "dark", at(2))).toBe("night");
  });
  it("fixed skies ignore the theme", () => {
    expect(resolveSky("dusk", "dark")).toBe("dusk");
  });
});

describe("detectTier", () => {
  it("gives phones and software rendering the light tier", () => {
    expect(detectTier({ width: 390, mobile: true, gpu: "Mali-G52" })).toBe("low");
    expect(detectTier({ width: 1440, mobile: false, gpu: "Google SwiftShader" })).toBe("low");
    expect(detectTier({ width: 1440, mobile: false, memoryGb: 2 })).toBe("low");
  });
  it("lets recent flagship phones have the middle tier", () => {
    expect(detectTier({ width: 430, mobile: true, gpu: "Apple GPU" })).toBe("medium");
  });
  it("gives integrated graphics the middle tier and strong desktops the top one", () => {
    expect(detectTier({ width: 1440, mobile: false, cores: 8, memoryGb: 8, gpu: "Intel(R) UHD Graphics 620" })).toBe("medium");
    expect(detectTier({ width: 1920, mobile: false, cores: 16, memoryGb: 8, gpu: "NVIDIA GeForce RTX 4070" })).toBe("high");
  });
});
