import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runBuyerAgent, runAllActiveBuyers } from "@/lib/agents/runner";

/**
 * POST /api/agents/run
 * Body:
 *   { agent_id: string, max_negotiations?: number, auto_complete?: boolean, keywords?: string }
 *   OR { all: true, max_negotiations?: number, auto_complete?: boolean }
 */
export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    if (body.all === true) {
      const results = await runAllActiveBuyers(supabase, {
        maxNegotiationsPerAgent: body.max_negotiations ?? 1,
        autoComplete: body.auto_complete !== false,
      });
      return NextResponse.json({ results });
    }

    if (!body.agent_id) {
      return NextResponse.json(
        { error: "agent_id is required (or pass all: true)" },
        { status: 400 }
      );
    }

    const result = await runBuyerAgent(supabase, body.agent_id, {
      maxNegotiations: body.max_negotiations ?? 2,
      autoComplete: body.auto_complete !== false,
      keywords: body.keywords,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
