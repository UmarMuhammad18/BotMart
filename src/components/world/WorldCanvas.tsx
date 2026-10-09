"use client";

import dynamic from "next/dynamic";
import type { WorldSnapshot } from "@/lib/types";

const IsoScene = dynamic(
  () => import("@/components/world/IsoScene").then((m) => m.IsoScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[420px] rounded-2xl border border-white/10 bg-zinc-950 flex items-center justify-center text-sm text-zinc-500">
        Loading 3D marketplace…
      </div>
    ),
  }
);

export function WorldCanvas({ snapshot }: { snapshot: WorldSnapshot }) {
  return <IsoScene snapshot={snapshot} />;
}
