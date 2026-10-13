import { NextResponse } from "next/server";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedDemo } from "@/lib/seed";

export async function POST(request: Request) {
  try {
    const limited = await rateLimit(request, "seed", LIMITS.seed);
    if (!limited.ok) return tooManyRequests(limited, "seed requests");
    const supabase = createAdminClient();
    const data = await seedDemo(supabase);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
