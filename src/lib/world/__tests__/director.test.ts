import { describe, it, expect, vi } from "vitest";
import { WorldDirector } from "../director";
import type { WorldBeat } from "@/lib/types";

const stage = {
  stall: (id: string) =>
    id === "L1" ? { x: 4, z: 2, title: "Headphones" } : undefined,
  agentName: (id: string) => (id === "B" ? "BargainBot" : "GadgetGuru"),
};

let n = 0;
function beat(agent: "B" | "S", type: string, price: number | null): WorldBeat {
  n++;
  return {
    id: `d${n}`,
    at: new Date(2026, 0, 1, 0, 0, n).toISOString(),
    agent_id: agent,
    negotiation_id: "N1",
    buyer_id: "B",
    seller_id: "S",
    listing_id: "L1",
    role: agent === "B" ? "buyer" : "seller",
    type,
    price,
    message: "",
  };
}

function run(d: WorldDirector, ms: number) {
  for (let t = 0; t < ms; t += 50) d.tick(50);
}

describe("WorldDirector", () => {
  it("stages a negotiation: approach, bubbles in order, deal burst, release", () => {
    const d = new WorldDirector(stage);
    d.pushLive([beat("B", "offer", 80), beat("S", "counter", 92), beat("B", "accept", 92)]);

    run(d, 100);
    expect(d.placementFor("B")).toMatchObject({ x: 4.95, z: 3.6 });
    expect(d.placementFor("S")).toMatchObject({ x: 3.05, z: 3.6 });
    expect(d.bubbleFor("B")).toBeNull(); // still walking over

    run(d, 2600);
    expect(d.bubbleFor("B")?.tone).toBe("offer");

    run(d, 2300);
    expect(d.bubbleFor("S")?.price).toBe(92);

    run(d, 2300);
    expect(d.bubbleFor("B")?.tone).toBe("accept");

    run(d, 2300);
    expect(d.activeBursts[0]?.label).toBe("DEAL £92");

    run(d, 2700);
    expect(d.placementFor("B")).toBeNull();
    expect(d.feed[0].text).toContain("closed the deal at £92");
  });

  it("holds a live scene open until the terminal beat arrives", () => {
    const end = vi.fn();
    const d = new WorldDirector(stage, { onLiveSceneEnd: end });
    d.pushLive([beat("B", "offer", 80)]);
    run(d, 10000);
    expect(d.placementFor("B")).not.toBeNull();
    d.pushLive([beat("S", "reject", null)]);
    run(d, 8000);
    expect(d.placementFor("B")).toBeNull();
    expect(end).toHaveBeenCalledOnce();
  });

  it("ignores duplicate beats", () => {
    const d = new WorldDirector(stage);
    const b = beat("B", "offer", 80);
    d.pushLive([b]);
    d.pushLive([b]);
    run(d, 3000);
    expect(d.feed).toHaveLength(1);
  });

  it("replays history, buffers live beats, then goes live when done", () => {
    const d = new WorldDirector(stage);
    d.startReplay([beat("B", "offer", 70), beat("S", "accept", 70)]);
    expect(d.mode).toBe("replay");
    expect(d.progress).toEqual({ done: 0, total: 1 });

    d.pushLive([{ ...beat("B", "offer", 50), negotiation_id: "N2" }]);
    expect(d.bufferedCount).toBe(1);

    run(d, 12000);
    expect(d.mode).toBe("live");
    run(d, 3000);
    expect(d.bubbleFor("B")?.price).toBe(50);
  });

  it("does not stage self-trades", () => {
    const d = new WorldDirector(stage);
    d.pushLive([{ ...beat("B", "offer", 80), seller_id: "B" }]);
    run(d, 3000);
    expect(d.placementFor("B")).toBeNull();
    expect(d.feed).toHaveLength(1);
  });

  it("speed multiplies the clock", () => {
    const d = new WorldDirector(stage);
    d.setSpeed(4);
    d.pushLive([beat("B", "offer", 80)]);
    run(d, 800);
    expect(d.bubbleFor("B")?.tone).toBe("offer");
  });
});
