"use client";

import dynamic from "next/dynamic";
import type { WorldSnapshot } from "@/lib/types";

export type CameraMode = "overview" | "follow" | "court";

export type WorldSelection =
  | { kind: "agent"; id: string }
  | { kind: "stall"; id: string }
  | null;

const IsoScene = dynamic(
  () => import("@/components/world/IsoScene").then((m) => m.IsoScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[480px] rounded-2xl border border-white/10 bg-zinc-950 flex items-center justify-center text-sm text-zinc-500">
        Loading 3D marketplace…
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
}: {
  snapshot: WorldSnapshot;
  selection: WorldSelection;
  onSelect: (s: WorldSelection) => void;
  cameraMode: CameraMode;
  followAgentId: string | null;
}) {
  return (
    <IsoScene
      snapshot={snapshot}
      selection={selection}
      onSelect={onSelect}
      cameraMode={cameraMode}
      followAgentId={followAgentId}
    />
  );
}
