"use client";

import type { WorldSnapshot } from "@/lib/types";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import type { WorldSelection } from "@/components/world/WorldCanvas";

const SCALE = 4.2;
const OFFSET = 60;

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
    return { cx: OFFSET + x * SCALE, cy: OFFSET + z * SCALE };
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/60 p-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 px-1 mb-1">
        Mini-map
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto aspect-square rounded-lg bg-[#0a0c10]"
      >
        <rect x={0} y={0} width={w} height={h} fill="#0a0c10" />
        {/* grid */}
        {[20, 40, 60, 80, 100].map((g) => (
          <g key={g}>
            <line x1={g} y1={0} x2={g} y2={h} stroke="#1f2937" strokeWidth={0.5} />
            <line x1={0} y1={g} x2={w} y2={g} stroke="#1f2937" strokeWidth={0.5} />
          </g>
        ))}
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
              fill={s.status === "sold" || s.stock <= 0 ? "#52525b" : "#10b981"}
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
        <circle cx={OFFSET} cy={OFFSET + 10 * SCALE} r={4} fill="none" stroke="#a78bfa" strokeWidth={0.8} />
      </svg>
    </div>
  );
}
