"use client";

import type { WorldSnapshot } from "@/lib/types";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import type { WorldSelection } from "@/components/world/WorldCanvas";
import { COURT_POS, VILLAGE } from "@/lib/world/districts";
import { ZONES } from "@/lib/world/terrain";

/** Fit the whole village ring (plus cottages) into the 120-unit map. */
const OFFSET = 60;
const SCALE = (OFFSET - 4) / (VILLAGE.ringRadius + 4);

export function MiniMap({
  snapshot,
  selection,
  onSelect,
}: {
  snapshot: WorldSnapshot;
  selection: WorldSelection;
  onSelect: (s: WorldSelection) => void;
}) {
  const w = 120;
  const h = 120;

  function toXY(x: number, z: number) {
    return { cx: OFFSET + (x - VILLAGE.cx) * SCALE, cy: OFFSET + (z - VILLAGE.cz) * SCALE };
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-paper/60 p-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 px-1 mb-1">
        Mini-map
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto aspect-square rounded-lg bg-[#a8c98e]"
      >
        <rect x={0} y={0} width={w} height={h} fill="#a8c98e" />
        {/* ring road + market */}
        <circle cx={OFFSET} cy={OFFSET} r={ZONES.roadRadius * SCALE} fill="none" stroke="#b59a72" strokeWidth={ZONES.roadHalfWidth * 2 * SCALE} strokeOpacity={0.9} />
        <circle cx={OFFSET} cy={OFFSET} r={ZONES.marketRadius * SCALE} fill="#d8d0bb" />
        {/* cottages */}
        {snapshot.agents.map((a) => {
          if (!a.building) return null;
          const { cx, cy } = toXY(a.building.x, a.building.z);
          return (
            <rect
              key={`home-${a.id}`}
              x={cx - 3}
              y={cy - 3}
              width={6}
              height={6}
              rx={1}
              transform={`rotate(${(-a.building.rot * 180) / Math.PI} ${cx} ${cy})`}
              fill="#fbf7ec"
              fillOpacity={0.95}
            />
          );
        })}
        {(snapshot.districts || []).map((d) => {
          const { cx, cy } = toXY(d.x - d.w / 2, d.z - d.d / 2);
          return (
            <rect
              key={d.id}
              x={cx}
              y={cy}
              width={d.w * SCALE}
              height={d.d * SCALE}
              rx={2}
              fill={d.color}
              fillOpacity={0.08}
              stroke={d.color}
              strokeOpacity={0.45}
              strokeWidth={0.6}
            >
              <title>{d.label}</title>
            </rect>
          );
        })}
        {snapshot.stalls.map((s) => {
          const { cx, cy } = toXY(s.x, s.z);
          const active = selection?.kind === "stall" && selection.id === s.id;
          return (
            <rect
              key={s.id}
              x={cx - 3}
              y={cy - 3}
              width={6}
              height={6}
              rx={1}
              fill={s.status === "sold" || s.stock <= 0 ? "#8f8a7d" : "#2e7a34"}
              stroke={active ? "#fff" : "transparent"}
              strokeWidth={1}
              className="cursor-pointer"
              onClick={() => onSelect({ kind: "stall", id: s.id })}
            />
          );
        })}
        {snapshot.agents.map((a) => {
          const { cx, cy } = toXY(a.x, a.z);
          const active = selection?.kind === "agent" && selection.id === a.id;
          return (
            <circle
              key={a.id}
              cx={cx}
              cy={cy}
              r={active ? 3.5 : 2.5}
              fill={ROLE_BY_ID[a.role]?.hex || "#94a3b8"}
              stroke={active ? "#fff" : "transparent"}
              strokeWidth={1}
              className="cursor-pointer"
              onClick={() => onSelect({ kind: "agent", id: a.id })}
            />
          );
        })}
        {/* court marker */}
        <rect
          x={toXY(COURT_POS.x, COURT_POS.z).cx - 5}
          y={toXY(COURT_POS.x, COURT_POS.z).cy - 4}
          width={10}
          height={8}
          rx={1.5}
          fill="none"
          stroke="#5f9e86"
          strokeWidth={0.9}
        >
          <title>Court</title>
        </rect>
      </svg>
    </div>
  );
}
