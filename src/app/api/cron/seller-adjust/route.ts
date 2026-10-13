import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/auth";
import { runSellerAdjustments } from "@/lib/agents/seller";
import { resetDemoWorld } from "@/lib/maintenance";

/**
 * Daily: reset the demo village (old demo deals, budgets, stock), then let
 * sellers adjust prices. One cron does both to stay within Vercel Hobby limits.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const reset = await resetDemoWorld(supabase);
    const adjustments = await runSellerAdjustments(supabase);
    return NextResponse.json({ ok: true, reset, count: adjustments.length, adjustments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
