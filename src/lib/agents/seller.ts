import { SupabaseClient } from "@supabase/supabase-js";
import { logDecision } from "@/lib/agents/reputation";

/**
 * Seller autonomy: for each active seller agent, adjust prices on
 * stale active listings (no sale / low interest) and optionally relist sold-out.
 */
export async function runSellerAdjustments(supabase: SupabaseClient) {
  const { data: sellers } = await supabase
    .from("agents")
    .select("id, name, policy, status")
    .eq("status", "active");

  const adjustments: {
    seller: string;
    listing: string;
    old_price: number;
    new_price: number;
    reason: string;
  }[] = [];

  for (const seller of sellers || []) {
    const { data: listings } = await supabase
      .from("listings")
      .select("*")
      .eq("seller_agent_id", seller.id)
      .in("status", ["active", "sold"]);

    for (const listing of listings || []) {
      // Relist sold-out with low stock by restocking 1 unit at a slight discount
      if (listing.status === "sold" || (listing.stock ?? 0) <= 0) {
        const minPrice = Number(seller.policy?.min_price ?? listing.price * 0.7);
        const newPrice = Math.max(
          minPrice,
          Math.round(Number(listing.price) * 0.95)
        );
        await supabase
          .from("listings")
          .update({
            stock: 1,
            status: "active",
            price: newPrice,
          })
          .eq("id", listing.id);

        adjustments.push({
          seller: seller.name,
          listing: listing.title,
          old_price: Number(listing.price),
          new_price: newPrice,
          reason: "relist",
        });

        await logDecision(supabase, {
          agentId: seller.id,
          actionType: "relist",
          payload: {
            listing_id: listing.id,
            title: listing.title,
            old_price: listing.price,
            new_price: newPrice,
          },
          source: "rules",
        });
        continue;
      }

      // Stale active listing: created > 1 hour ago with no recent accepted deal
      const ageMs =
        Date.now() - new Date(listing.created_at || Date.now()).getTime();
      if (ageMs < 60 * 60 * 1000) continue;

      const minPrice = Number(
        seller.policy?.min_price ?? Number(listing.price) * 0.75
      );
      const discounted = Math.max(
        minPrice,
        Math.round(Number(listing.price) * 0.97)
      );

      if (discounted >= Number(listing.price)) continue;

      await supabase
        .from("listings")
        .update({ price: discounted })
        .eq("id", listing.id);

      adjustments.push({
        seller: seller.name,
        listing: listing.title,
        old_price: Number(listing.price),
        new_price: discounted,
        reason: "stale_discount",
      });

      await logDecision(supabase, {
        agentId: seller.id,
        actionType: "price_adjust",
        payload: {
          listing_id: listing.id,
          title: listing.title,
          old_price: listing.price,
          new_price: discounted,
        },
        source: "rules",
      });
    }
  }

  return adjustments;
}
