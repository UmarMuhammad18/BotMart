"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { WorldSnapshot } from "@/lib/types";
import { enrichBusySnapshot } from "@/components/world/busyMotion";

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
      <div
        className="w-full rounded-2xl border border-white/10 bg-zinc-950 flex items-center justify-center text-sm text-zinc-500"
        style={{ height: "min(70vh, 640px)", minHeight: 520 }}
      >
        Loading busy marketplace…
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
  // Keep the floor visually alive even when few real negotiations are open
  const busy = useMemo(() => enrichBusySnapshot(snapshot), [snapshot]);

  return (
    <IsoScene
      snapshot={busy}
      selection={selection}
      onSelect={onSelect}
      cameraMode={cameraMode}
      followAgentId={followAgentId}
    />
  );
}
