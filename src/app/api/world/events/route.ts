import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NegotiationMessage, WorldBeat } from "@/lib/types";

const RECENT_NEGOTIATIONS = 14;

/**
 * GET /api/world/events[?since=ISO]
 * World "beats", oldest first.
 *
 * Negotiation beats come from negotiations.messages (the source of truth);
 * ambient beats (match / repricing / court) come from agent_decisions when
 * that table exists. `since` is exclusive. Without it, returns the most
 * recent negotiations whenever they happened, for replay.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");
    const supabase = createAdminClient();

    let negQuery = supabase
      .from("negotiations")
      .select("id, buyer_agent_id, seller_agent_id, listing_id, messages, updated_at")
      .order("updated_at", { ascending: false })
      .limit(since ? 50 : RECENT_NEGOTIATIONS);
    if (since) negQuery = negQuery.gt("updated_at", since);

    const { data: negs, error } = await negQuery;
    if (error) return NextResponse.json({ beats: [], error: error.message });

    const beats: WorldBeat[] = [];

    for (const n of negs || []) {
      const messages = (n.messages || []) as NegotiationMessage[];
      messages.forEach((m, i) => {
        if (since && m.timestamp <= since) return;
        beats.push({
          // Stable per message so clients can de-duplicate overlapping polls
          id: `${n.id}:${i}`,
          at: m.timestamp,
          agent_id: m.from === "buyer" ? n.buyer_agent_id : n.seller_agent_id,
          negotiation_id: n.id,
          buyer_id: n.buyer_agent_id,
          seller_id: n.seller_agent_id,
          listing_id: n.listing_id,
          role: m.from,
          type: m.type,
          price: m.price ?? null,
          message: m.message || "",
        });
      });
    }

    // Ambient beats are optional: the table may not exist on older projects
    if (since) {
      const { data: decisions } = await supabase
        .from("agent_decisions")
        .select("id, agent_id, action_type, payload, created_at")
        .is("negotiation_id", null)
        .gt("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50);

      for (const d of decisions || []) {
        const payload = (d.payload || {}) as Record<string, unknown>;
        const price = payload.price ?? payload.new_price ?? null;
        beats.push({
          id: d.id,
          at: d.created_at,
          agent_id: d.agent_id,
          negotiation_id: null,
          buyer_id: null,
          seller_id: null,
          listing_id: (payload.listing_id as string | undefined) ?? null,
          role: null,
          type: d.action_type || "message",
          price: price == null ? null : Number(price),
          message: String(payload.message ?? ""),
        });
      }
    }

    beats.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    return NextResponse.json({ beats });
  } catch (err) {
    console.error("[world/events]", err);
    return NextResponse.json({ beats: [], error: "Failed to load events" });
  }
}
