import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSellerAdjustments } from "@/lib/agents/seller";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const adjustments = await runSellerAdjustments(supabase);
    return NextResponse.json({ ok: true, count: adjustments.length, adjustments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
