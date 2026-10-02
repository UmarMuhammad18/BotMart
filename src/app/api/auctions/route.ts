import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runListingAuction } from "@/lib/marketplace/auction";

/** POST { listing_id, max_buyers? } — run multi-buyer auction on a listing */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.listing_id) {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const result = await runListingAuction(supabase, body.listing_id, {
      maxBuyers: body.max_buyers ?? 3,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Auction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
