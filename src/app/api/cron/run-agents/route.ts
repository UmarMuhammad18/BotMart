import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAllActiveBuyers } from "@/lib/agents/runner";

/**
 * Hourly cron: run active buyer agents once each.
 * Secure with CRON_SECRET (Vercel sends Authorization: Bearer <CRON_SECRET>).
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const results = await runAllActiveBuyers(supabase, {
      maxNegotiationsPerAgent: 1,
      autoComplete: true,
    });

    return NextResponse.json({
      ok: true,
      ran: results.length,
      results: results.map((r) => ({
        agent: r.agent.name,
        started: r.negotiations_started.length,
        completed: r.negotiations_completed,
        skipped: r.skipped_reason,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
