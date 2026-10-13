"use client";

import dynamic from "next/dynamic";
import type { WorldSnapshot } from "@/lib/types";
import type { WorldDirector } from "@/lib/world/director";
import type { WorldOptions } from "@/lib/world/options";

export type CameraMode = "overview" | "follow" | "court";

export type WorldSelection =
  | { kind: "agent"; id: string }
  | { kind: "stall"; id: string }
  | null;

const VillageScene = dynamic(
  () => import("@/components/world/village/VillageScene").then((m) => m.VillageScene),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full rounded-2xl border border-ink/10 bg-zinc-50 flex items-center justify-center text-sm text-zinc-500"
        style={{ height: "min(70vh, 640px)", minHeight: 520 }}
      >
        Loading the village…
      </div>
    ),
  }
);

export function WorldCanvas({
  snapshot,
  selection,
  onSelect,
  cameraMode,
  followAgentId,
  director,
  options,
}: {
  snapshot: WorldSnapshot;
  selection: WorldSelection;
  onSelect: (s: WorldSelection) => void;
  cameraMode: CameraMode;
  followAgentId: string | null;
  director: WorldDirector;
  options: WorldOptions;
}) {
  return (
    <VillageScene
      snapshot={snapshot}
      director={director}
      selection={selection}
      onSelect={onSelect}
      cameraMode={cameraMode}
      followAgentId={followAgentId}
      options={options}
    />
  );
}
