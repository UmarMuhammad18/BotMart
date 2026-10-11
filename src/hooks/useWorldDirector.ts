"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { WorldDirector, type StageLookup } from "@/lib/world/director";
import type { WorldBeat, WorldSnapshot } from "@/lib/types";

const POLL_MS = 4000;
const EMPTY_STAGE: StageLookup = { stall: () => undefined, agentName: () => "An agent" };
/**
 * Message timestamps are taken before the DB write, so a strict cursor could
 * skip a beat written late. Re-ask for a window; the director de-dupes by id.
 */
const OVERLAP_MS = 30000;

export async function fetchBeats(since?: string): Promise<WorldBeat[]> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  const res = await fetch(`/api/world/events${qs}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.beats || [];
}

/**
 * Owns the WorldDirector for the /world page:
 * - on mount, replays the most recent negotiations
 * - then streams new beats (Supabase Realtime nudge + polling fallback)
 * - calls onLiveSceneEnd so the page can refresh budgets / stock
 */
export function useWorldDirector(
  snapshot: WorldSnapshot | null,
  onLiveSceneEnd: () => void
) {
  const stage = useMemo<StageLookup>(() => {
    const stalls = new Map((snapshot?.stalls || []).map((s) => [s.id, s]));
    const names = new Map((snapshot?.agents || []).map((a) => [a.id, a.name]));
    return {
      stall: (id) => stalls.get(id),
      agentName: (id) => names.get(id) || "An agent",
    };
  }, [snapshot]);

  // useMemo (not useState) so Fast Refresh rebuilds the director when
  // director.ts changes, instead of keeping an instance of the old class.
  // The stage is applied by the effect below.
  const director = useMemo(() => new WorldDirector(EMPTY_STAGE), []);

  useEffect(() => {
    director.setStage(stage);
  }, [director, stage]);

  useEffect(() => {
    director.setOnLiveSceneEnd(onLiveSceneEnd);
  }, [director, onLiveSceneEnd]);

  const hasSnapshot = snapshot != null;

  useEffect(() => {
    if (!hasSnapshot) return;
    let cancelled = false;
    let cursor: string | undefined;

    const advance = (beats: WorldBeat[]) => {
      const last = beats[beats.length - 1]?.at;
      if (last && (!cursor || last > cursor)) cursor = last;
    };

    const poll = async () => {
      if (!cursor) return;
      const since = new Date(new Date(cursor).getTime() - OVERLAP_MS).toISOString();
      const beats = await fetchBeats(since);
      if (cancelled) return;
      advance(beats);
      director.pushLive(beats);
    };

    void (async () => {
      const history = await fetchBeats();
      if (cancelled) return;
      cursor = new Date().toISOString();
      advance(history);
      director.startReplay(history);
    })();

    const timer = setInterval(() => void poll(), POLL_MS);

    // Realtime is a nudge to poll now; the API is still the source of truth
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
      channel = supabase
        .channel("botmart-world-beats")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "agent_decisions" },
          () => void poll()
        )
        .subscribe();
    } catch {
      // No public Supabase env → polling only
    }

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [director, hasSnapshot]);

  // Re-render on discrete director changes (bubbles, scenes, mode)
  useSyncExternalStore(director.subscribe, director.getVersion, director.getVersion);

  return director;
}
