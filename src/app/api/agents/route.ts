import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { parseNewAgent } from "@/lib/agents/newAgent";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const user = await getSessionUser();
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine") === "1";

    let query = supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    // When logged in and ?mine=1, only return the user's agents
    if (user && mine) {
      query = query.eq("owner_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const limited = await rateLimit(request, "create-agent", LIMITS.createAgent);
    if (!limited.ok) return tooManyRequests(limited, "new agents");
    const supabase = createAdminClient();
    const body = await request.json();
    const parsed = parseNewAgent(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { name, description, goal, budget, policy, firstListing } = parsed;

    const user = await getSessionUser();
    const owner_id = user?.id ?? "hackathon-user";
    // Approval needs someone to ask: only for signed-in owners
    if (!user) delete policy.require_approval;

    const { data: clash } = await supabase.from("agents").select("id").ilike("name", name.replace(/[%_\\]/g, "\\$&")).limit(1).maybeSingle();
    if (clash) {
      return NextResponse.json({ error: `There's already an agent called ${name}. Try another name.` }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("agents")
      .insert({
        name,
        description,
        goal,
        budget,
        policy,
        owner_id,
        status: "active",
        reputation: 50,
      })
      .select()
      .single();

    // A seller can put its first item on a stall straight away
    if (!error && data && firstListing) {
      await supabase.from("listings").insert({
        seller_agent_id: data.id,
        title: firstListing.title,
        description: firstListing.description,
        price: firstListing.price,
        category: firstListing.category,
        stock: firstListing.stock,
        status: "active",
      });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
