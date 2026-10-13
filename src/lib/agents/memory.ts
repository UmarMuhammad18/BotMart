import type { SupabaseClient } from "@supabase/supabase-js";
import type { NegotiationMessage } from "@/lib/types";
import type { Relationship } from "@/lib/agents/negotiate";

/**
 * Agents remember how dealings with each counterpart went. Notes live in
 * agents.memory (jsonb, newest first, capped) and feed back into negotiation:
 * a seller who was lowballed by a buyer holds out for more next time; repeat
 * partners close a little more easily.
 */
export type MemoryOutcome = "deal" | "walked" | "lowballed" | "stalled" | "court";

export type MemoryNote = {
  text: string;
  at: string;
  negotiation_id?: string;
  counterpart_id?: string;
  counterpart_name?: string;
  outcome?: MemoryOutcome;
  price?: number;
};

const MAX_NOTES = 24;
/** An opening offer under this share of asking counts as a lowball. */
export const LOWBALL_RATIO = 0.7;

export function asNotes(memory: unknown): MemoryNote[] {
  return Array.isArray(memory)
    ? (memory.filter((m) => m && typeof m === "object" && typeof (m as MemoryNote).text === "string") as MemoryNote[])
    : [];
}

/** Summarise what `notes` say about one counterpart. Pure, tested. */
export function relationshipWith(memory: unknown, counterpartId: string): Relationship {
  const about = asNotes(memory).filter((n) => n.counterpart_id === counterpartId);
  const count = (o: MemoryOutcome) => about.filter((n) => n.outcome === o).length;
  const deals = count("deal");
  const sour = count("lowballed") + 0.5 * (count("walked") + count("stalled"));
  return {
    grudge: Math.max(0, Math.min(1, sour / 3 - deals * 0.15)),
    loyalty: Math.min(1, deals / 3),
    notes: about.slice(0, 4).map((n) => n.text),
  };
}

type Party = { id: string; name: string; memory?: unknown };

/** The notes each side should keep from one finished negotiation. Pure, tested. */
export function notesFromNegotiation(opts: {
  negotiationId: string;
  buyer: Party;
  seller: Party;
  listingTitle: string;
  listingPrice: number;
  messages: NegotiationMessage[];
  outcome: "accepted" | "rejected" | "escalated";
  price?: number | null;
  at?: string;
}): { buyer: MemoryNote; seller: MemoryNote } {
  const at = opts.at ?? new Date().toISOString();
  const opening = opts.messages.find((m) => m.from === "buyer" && m.price != null)?.price;
  const lowball = opening != null && opening < opts.listingPrice * LOWBALL_RATIO;
  const price = opts.price != null ? `£${Math.round(opts.price)}` : null;
  const base = { at, negotiation_id: opts.negotiationId };

  if (opts.outcome === "accepted") {
    return {
      buyer: { ...base, counterpart_id: opts.seller.id, counterpart_name: opts.seller.name, outcome: "deal", price: opts.price ?? undefined, text: `Bought ${opts.listingTitle} from ${opts.seller.name} for ${price}.` },
      seller: { ...base, counterpart_id: opts.buyer.id, counterpart_name: opts.buyer.name, outcome: "deal", price: opts.price ?? undefined, text: `Sold ${opts.listingTitle} to ${opts.buyer.name} for ${price}.` },
    };
  }
  const walkedBy = [...opts.messages].reverse().find((m) => m.type === "reject")?.from;
  const failed: MemoryOutcome = opts.outcome === "escalated" ? "stalled" : "walked";
  return {
    buyer: {
      ...base,
      counterpart_id: opts.seller.id,
      counterpart_name: opts.seller.name,
      outcome: failed,
      text:
        opts.outcome === "escalated"
          ? `Talks with ${opts.seller.name} over ${opts.listingTitle} went nowhere.`
          : walkedBy === "seller"
            ? `${opts.seller.name} turned me down on ${opts.listingTitle}.`
            : `I walked away from ${opts.seller.name}'s ${opts.listingTitle}: too pricey.`,
    },
    seller: {
      ...base,
      counterpart_id: opts.buyer.id,
      counterpart_name: opts.buyer.name,
      outcome: lowball ? "lowballed" : failed,
      text: lowball
        ? `${opts.buyer.name} lowballed me at £${opening} for ${opts.listingTitle} (asking £${opts.listingPrice}).`
        : `No deal with ${opts.buyer.name} on ${opts.listingTitle}.`,
    },
  };
}

/** Prepend a note to an agent's memory, keeping the newest MAX_NOTES. */
export async function remember(supabase: SupabaseClient, agentId: string, note: MemoryNote) {
  try {
    const { data } = await supabase.from("agents").select("memory").eq("id", agentId).single();
    const next = [note, ...asNotes(data?.memory)].slice(0, MAX_NOTES);
    await supabase.from("agents").update({ memory: next }).eq("id", agentId);
  } catch {
    // Memory is a nicety; never break settlement over it
  }
}

/** Write both sides' notes for a finished negotiation. */
export async function rememberNegotiation(
  supabase: SupabaseClient,
  opts: Parameters<typeof notesFromNegotiation>[0]
) {
  const notes = notesFromNegotiation(opts);
  await Promise.all([remember(supabase, opts.buyer.id, notes.buyer), remember(supabase, opts.seller.id, notes.seller)]);
}
