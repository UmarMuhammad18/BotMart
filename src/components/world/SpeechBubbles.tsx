"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import * as THREE from "three";
import { stackBubbles, type BubbleBox } from "@/lib/world/bubbleLayout";
import type { BubbleTone, WorldDirector } from "@/lib/world/director";

/**
 * Speech bubbles live in one DOM layer over the canvas (not one drei <Html>
 * per robot) so they can be laid out together: <BubbleProjector> runs inside
 * the Canvas, projects each speaker to screen space every frame and stacks
 * colliding bubbles; <BubbleLayer> renders them outside the Canvas.
 */

export type BubbleRegistry = RefObject<Map<string, HTMLDivElement>>;

const TONE_STYLE: Record<BubbleTone, string> = {
  offer: "border-sky-400/60 bg-sky-950/90 text-sky-100",
  counter: "border-amber-400/60 bg-amber-950/90 text-amber-100",
  accept: "border-emerald-400/70 bg-emerald-950/90 text-emerald-100",
  reject: "border-rose-400/60 bg-rose-950/90 text-rose-100",
  info: "border-white/15 bg-zinc-900/90 text-zinc-200",
};
const LEADER: Record<BubbleTone, string> = {
  offer: "bg-sky-400/60",
  counter: "bg-amber-400/60",
  accept: "bg-emerald-400/70",
  reject: "bg-rose-400/60",
  info: "bg-white/25",
};

/** Height above the floor the bubble points at (just over the name tag). */
const ANCHOR_Y = 2.45;
/** Only draw a leader line once a bubble is pushed this far off its speaker. */
const LEADER_MIN_PX = 10;

export function BubbleLayer({
  director,
  registry,
}: {
  director: WorldDirector;
  registry: BubbleRegistry;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {director.bubbles.map((b) => (
        <div
          key={b.agentId}
          data-agent={b.agentId}
          ref={(el) => {
            if (el) registry.current.set(b.agentId, el);
            else registry.current.delete(b.agentId);
          }}
          className="absolute left-0 top-0 opacity-0 transition-opacity duration-200 will-change-transform"
        >
          <div
            key={b.key}
            className={`world-bubble max-w-[210px] w-max rounded-xl border px-2.5 py-1.5 text-[11px] leading-snug shadow-lg backdrop-blur ${TONE_STYLE[b.tone]}`}
          >
            <div className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
              {director.nameOf(b.agentId)}
            </div>
            {b.price != null &&
              b.tone !== "info" &&
              !b.text.includes(`£${Math.round(b.price)}`) && (
                <span className="font-mono font-semibold mr-1">£{Math.round(b.price)}</span>
              )}
            {b.text}
          </div>
          <div data-leader className={`absolute top-full w-px ${LEADER[b.tone]}`} />
        </div>
      ))}
    </div>
  );
}

const _v = new THREE.Vector3();

export function BubbleProjector({
  director,
  registry,
}: {
  director: WorldDirector;
  registry: BubbleRegistry;
}) {
  // Smoothed on-screen position per bubble so stacking changes glide
  const smoothRef = useRef(new Map<string, { x: number; y: number }>());
  useFrame(({ camera, size }) =>
    layoutBubbles(camera, size, director, registry.current, smoothRef.current)
  );
  return null;
}

/** Project speakers to screen, stack colliding bubbles, write DOM styles. */
function layoutBubbles(
  camera: THREE.Camera,
  size: { width: number; height: number },
  director: WorldDirector,
  els: Map<string, HTMLDivElement>,
  smooth: Map<string, { x: number; y: number }>
) {
  if (els.size === 0) return;

  const boxes: (BubbleBox & { el: HTMLDivElement })[] = [];
  for (const [agentId, el] of els) {
    const p = director.livePos.get(agentId);
    if (!p) continue;
    _v.set(p.x, ANCHOR_Y, p.z).project(camera);
    if (_v.z > 1 || Math.abs(_v.x) > 1.2 || Math.abs(_v.y) > 1.2) {
      el.style.opacity = "0";
      continue;
    }
    boxes.push({
      key: agentId,
      ax: ((_v.x + 1) / 2) * size.width,
      ay: ((1 - _v.y) / 2) * size.height,
      w: el.offsetWidth,
      h: el.offsetHeight,
      el,
    });
  }

  const placed = stackBubbles(boxes, { width: size.width, gap: 6 });
  for (const pos of placed) {
    const box = boxes.find((b) => b.key === pos.key)!;
    const prev = smooth.get(pos.key);
    const cur = prev
      ? { x: prev.x + (pos.x - prev.x) * 0.25, y: prev.y + (pos.y - prev.y) * 0.25 }
      : { x: pos.x, y: pos.y };
    smooth.set(pos.key, cur);

    box.el.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0)`;
    box.el.style.opacity = "1";

    // Leader line from the bubble down to its speaker when displaced
    const leader = box.el.querySelector<HTMLDivElement>("[data-leader]");
    if (leader) {
      const drop = box.ay - (cur.y + box.h);
      leader.style.height = `${Math.max(0, drop)}px`;
      leader.style.left = `${Math.min(Math.max(box.ax - cur.x, 6), box.w - 6)}px`;
      leader.style.opacity = drop > LEADER_MIN_PX ? "1" : "0";
    }
  }
  for (const key of smooth.keys()) if (!els.has(key)) smooth.delete(key);
}
