import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { holdCourt } from "@/lib/court/session";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, "court", LIMITS.court);
    if (!limited.ok) return tooManyRequests(limited, "court sessions");
    const body = await req.json();
    const negotiation_id = body.negotiation_id as string | undefined;
    if (!negotiation_id) {
      return NextResponse.json({ error: "negotiation_id is required" }, { status: 400 });
    }

    const result = await holdCourt(createAdminClient(), negotiation_id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.session);
  } catch (err) {
    console.error("[court]", err);
    return NextResponse.json({ error: "Court session failed" }, { status: 500 });
  }
}
