import { SupabaseClient } from "@supabase/supabase-js";
import { SEED_AGENTS, SEED_LISTINGS } from "@/lib/seed-data";

export async function seedDemo(supabase: SupabaseClient) {
  for (const agent of SEED_AGENTS) {
    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("name", agent.name)
      .maybeSingle();

    if (!existing) {
      await supabase.from("agents").insert({
        name: agent.name,
        description: agent.description,
        budget: agent.budget,
        policy: agent.policy,
        owner_id: "hackathon-user",
        status: "active",
        reputation: 62,
      });
    }
  }

  const { data: agents } = await supabase.from("agents").select("id, name");
  const byName = new Map((agents || []).map((a) => [a.name, a.id]));

  for (const listing of SEED_LISTINGS) {
    const sellerId = byName.get(listing.seller);
    if (!sellerId) continue;

    const { data: existing } = await supabase
      .from("listings")
      .select("id")
      .eq("title", listing.title)
      .eq("seller_agent_id", sellerId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("listings").insert({
        seller_agent_id: sellerId,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        stock: listing.stock,
        status: "active",
      });
    }
  }

  const { data: seededAgents } = await supabase
    .from("agents")
    .select("*")
    .in(
      "name",
      SEED_AGENTS.map((a) => a.name)
    );
  const { data: seededListings } = await supabase
    .from("listings")
    .select("*, seller:agents!seller_agent_id (id, name)")
    .in(
      "title",
      SEED_LISTINGS.map((l) => l.title)
    );

  return {
    agents: seededAgents || [],
    listings: seededListings || [],
  };
}
