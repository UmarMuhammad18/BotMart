import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

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
    const supabase = createAdminClient();
    const body = await request.json();
    const { name, description, budget, policy, goal } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const user = await getSessionUser();
    const owner_id = user?.id ?? "hackathon-user";

    const { data, error } = await supabase
      .from("agents")
      .insert({
        name,
        description: description || null,
        goal: goal || description || null,
        budget: budget || 1000,
        policy: policy || {},
        owner_id,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
