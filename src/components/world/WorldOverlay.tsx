"use client";

import { History, Radio } from "lucide-react";
import type { WorldDirector } from "@/lib/world/director";

const SPEEDS = [1, 2, 4] as const;

/** Playback HUD over the 3D canvas: live/replay state, speed, now playing. */
export function WorldOverlay({
  director,
  onReplay,
}: {
  director: WorldDirector;
  onReplay: () => void;
}) {
  const progress = director.progress;
  const replaying = director.mode === "replay";
  const playing = director.nowPlaying;
  const buffered = director.bufferedCount;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-ink/10 bg-paper/60 px-3 py-2 text-xs backdrop-blur">
          {replaying ? (
            <>
              <History size={13} className="text-sky-700" />
              <span className="font-semibold text-sky-800">Replay</span>
              {progress && (
                <>
                  <span className="text-zinc-600 font-mono">
                    {progress.done}/{progress.total}
                  </span>
                  <span className="h-1 w-16 overflow-hidden rounded-full bg-ink/10">
                    <span
                      className="block h-full bg-sky-600 transition-all"
                      style={{
                        width: `${(progress.done / Math.max(1, progress.total)) * 100}%`,
                      }}
                    />
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={() => director.goLive()}
                className="ml-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-700 hover:bg-emerald-500/25"
              >
                Go live{buffered > 0 ? ` · ${buffered} new` : ""}
              </button>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              <span className="font-semibold text-emerald-800">Live</span>
              <button
                type="button"
                onClick={onReplay}
                className="ml-1 inline-flex items-center gap-1 rounded-md bg-ink/5 px-2 py-0.5 text-zinc-700 hover:bg-ink/10"
              >
                <Radio size={11} /> Replay recent
              </button>
            </>
          )}
        </div>

        <div className="pointer-events-auto flex overflow-hidden rounded-xl border border-ink/10 bg-paper/60 text-xs backdrop-blur">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => director.setSpeed(s)}
              aria-pressed={director.speed === s}
              className={`px-2.5 py-2 font-mono transition ${
                director.speed === s
                  ? "bg-ink/15 text-ink"
                  : "text-zinc-600 hover:bg-ink/5"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <div className="max-w-full truncate rounded-xl border border-ink/10 bg-paper/60 px-3 py-2 text-xs text-zinc-700 backdrop-blur">
          {playing ? (
            <>
              <span className="mr-1.5 text-amber-700">Now playing</span>
              {playing}
            </>
          ) : replaying ? (
            "Staging the next negotiation…"
          ) : (
            "The market is quiet. Run buyers from Agents, or replay recent deals."
          )}
        </div>
      </div>
    </div>
  );
}
