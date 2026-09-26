import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

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
}

export async function POST(request: Request) {
  const supabase = await createClient();
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
}
