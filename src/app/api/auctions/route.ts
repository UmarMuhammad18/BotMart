import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runListingAuction } from "@/lib/marketplace/auction";
import { DEMO_OWNER_FILTER, getSessionUser } from "@/lib/auth";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST { listing_id, max_buyers? } — multi-buyer race on one listing.
 * Bidders are demo/unowned agents plus the caller's own agents; nobody can
 * spend another user's agent budget.
 */
export async function POST(request: Request) {
  try {
    const limited = await rateLimit(request, "auction", LIMITS.auction);
    if (!limited.ok) return tooManyRequests(limited, "auctions");
    const body = await request.json();
    if (!body.listing_id) {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      );
    }

    const user = await getSessionUser();
    const ownerFilter = user
      ? `${DEMO_OWNER_FILTER},owner_id.eq.${user.id}`
      : DEMO_OWNER_FILTER;

    const supabase = createAdminClient();
    const result = await runListingAuction(supabase, body.listing_id, {
      maxBuyers: Math.min(Number(body.max_buyers) || 3, 5),
      ownerFilter,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Auction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
