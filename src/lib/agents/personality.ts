/**
 * Negotiating personalities. Each one tunes the rule engine (how low a buyer
 * opens, when it accepts, how fast either side concedes) and gives the LLM a
 * one-line character brief. Unknown styles behave as "balanced", which is
 * exactly the engine's original behaviour.
 */
export type PersonalityId = "balanced" | "thrifty" | "friendly" | "impatient" | "firm" | "patient";

export type Personality = {
  id: PersonalityId;
  label: string;
  blurb: string;
  /** Character brief for the LLM. */
  brief: string;
  buyer: {
    /** Opening offer as a fraction of the asking price. */
    opening: number;
    /** Accept a seller price at or under this fraction of asking. */
    acceptAt: number;
    /** How far to move toward the seller's price on each counter (0..1). */
    concession: number;
  };
  seller: {
    /** Never accept under this fraction of asking (policy.min_price may raise it). */
    floor: number;
    /** Accept a buyer price at or over this fraction of asking. */
    acceptAt: number;
    /** How far to move toward the buyer's price on each counter (0..1). */
    concession: number;
  };
};

export const PERSONALITIES: Personality[] = [
  {
    id: "balanced",
    label: "Balanced",
    blurb: "Opens fair, meets in the middle, closes reasonable deals.",
    brief: "You are even-handed: fair openings, steady concessions.",
    buyer: { opening: 0.8, acceptAt: 0.92, concession: 0.5 },
    seller: { floor: 0.75, acceptAt: 0.88, concession: 0.5 },
  },
  {
    id: "thrifty",
    label: "Penny-pincher",
    blurb: "Opens low and gives ground slowly. Walks away happily.",
    brief: "You are thrifty: open low, concede in small steps, happy to walk away.",
    buyer: { opening: 0.68, acceptAt: 0.86, concession: 0.35 },
    seller: { floor: 0.82, acceptAt: 0.92, concession: 0.35 },
  },
  {
    id: "friendly",
    label: "Friendly",
    blurb: "Warm, generous and quick to find a price that works for both.",
    brief: "You are warm and cooperative: generous openings, quick to agree on a fair price.",
    buyer: { opening: 0.86, acceptAt: 0.95, concession: 0.6 },
    seller: { floor: 0.7, acceptAt: 0.85, concession: 0.6 },
  },
  {
    id: "impatient",
    label: "Speedy",
    blurb: "Wants it done now. Pays a little more to close fast.",
    brief: "You are in a hurry: you'd rather pay a bit more than haggle for long.",
    buyer: { opening: 0.9, acceptAt: 1, concession: 0.75 },
    seller: { floor: 0.7, acceptAt: 0.82, concession: 0.7 },
  },
  {
    id: "firm",
    label: "Hard-nosed",
    blurb: "Tough opener, small concessions, protects every pound.",
    brief: "You are a tough negotiator: hard opening, small concessions, firm limits.",
    buyer: { opening: 0.7, acceptAt: 0.88, concession: 0.3 },
    seller: { floor: 0.85, acceptAt: 0.93, concession: 0.3 },
  },
  {
    id: "patient",
    label: "Patient",
    blurb: "Takes its time, inches toward a good price over many rounds.",
    brief: "You are patient: many small steps toward a good price, never rushed.",
    buyer: { opening: 0.75, acceptAt: 0.9, concession: 0.25 },
    seller: { floor: 0.78, acceptAt: 0.9, concession: 0.25 },
  },
];

const BY_ID = new Map(PERSONALITIES.map((p) => [p.id, p]));
/** Older seed styles that map onto a personality. */
const ALIASES: Record<string, PersonalityId> = { strict: "firm", curious: "balanced" };

export function personalityFor(style?: string | null): Personality {
  const key = (style || "").toLowerCase().trim();
  return BY_ID.get(key as PersonalityId) ?? BY_ID.get(ALIASES[key]) ?? BY_ID.get("balanced")!;
}
