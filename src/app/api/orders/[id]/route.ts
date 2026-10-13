import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canControlAgent } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const status = body.status as string | undefined;

    if (!status || !["pending", "paid", "fulfilled", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
    }

    const supabase = createAdminClient();
    // Only the buyer's or seller's controller may move an order along
    const { data: order } = await supabase
      .from("orders")
      .select("buyer_agent_id, seller_agent_id")
      .eq("id", id)
      .single();
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const [asBuyer, asSeller] = await Promise.all([
      canControlAgent(order.buyer_agent_id),
      canControlAgent(order.seller_agent_id),
    ]);
    if (!asBuyer && !asSeller) {
      return NextResponse.json({ error: "You are not a party to this order" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
