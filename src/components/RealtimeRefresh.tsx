"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Drop-in helper: call onChange when negotiations / orders / agents change.
 * Enable replication in Supabase for those tables.
 * Falls back silently if Realtime is not configured.
 */
export function RealtimeRefresh({
  onChange,
  tables = ["negotiations", "orders", "agents"],
}: {
  onChange: () => void;
  tables?: string[];
}) {
  useEffect(() => {
    try {
      const supabase = createClient();
      const channels = tables.map((table) =>
        supabase
          .channel(`botmart-rt-${table}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table },
            () => onChange()
          )
          .subscribe()
      );

      return () => {
        channels.forEach((ch) => supabase.removeChannel(ch));
      };
    } catch {
      return undefined;
    }
  }, [onChange, tables]);

  return null;
}
