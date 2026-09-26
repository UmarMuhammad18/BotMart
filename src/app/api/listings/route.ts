import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("listings")
      .select(`
        *,
        seller:agents!seller_agent_id (id, name, reputation)
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    const { seller_agent_id, title, description, price, category, stock } = body;

    if (!seller_agent_id || !title || !price) {
      return NextResponse.json(
        { error: "seller_agent_id, title and price are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("listings")
      .insert({
        seller_agent_id,
        title,
        description: description || null,
        price,
        category: category || null,
        stock: stock || 1,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
