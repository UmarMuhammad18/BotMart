"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribe to Supabase Realtime changes on a table and call onChange.
 * Enable tables in Supabase Dashboard → Database → Replication.
 */
export function useRealtimeTable(
  table: string,
  onChange: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`botmart-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onChange, enabled]);
}
