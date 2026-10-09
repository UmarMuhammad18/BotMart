import { JURY_ROLES, ROLE_BY_ID, rolePromptBias } from "@/lib/agents/roles";
import { grokJson } from "@/lib/grok";
import type {
  AgentRole,
  CourtSession,
  JurorBallot,
  JuryVote,
  NegotiationMessage,
} from "@/lib/types";

export type CourtInput = {
  negotiation_id: string;
  listing_title: string;
  listing_price: number;
  category?: string | null;
  current_offer: number | null;
  buyer_name: string;
  buyer_budget: number;
  buyer_spent: number;
  buyer_max?: number;
  seller_name: string;
  seller_min?: number;
  seller_reputation: number;
  buyer_reputation: number;
  messages: NegotiationMessage[];
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function ruleBallot(role: AgentRole, input: CourtInput): JurorBallot {
  const offer = input.current_offer ?? input.listing_price;
  const remaining = input.buyer_budget - input.buyer_spent;
  const max = input.buyer_max ?? remaining;
  const min = input.seller_min ?? input.listing_price * 0.7;
  const meta = ROLE_BY_ID[role];

  let vote: JuryVote = "counter";
  let confidence = 0.6;
  let reason = "";
  let suggested_price: number | undefined;

  switch (role) {
    case "juror_budget": {
      if (offer <= max * 0.85 && offer <= remaining) {
        vote = "accept";
        confidence = 0.85;
        reason = `Offer £${offer} is comfortably inside remaining budget £${remaining}.`;
      } else if (offer > remaining || offer > max) {
        vote = "reject";
        confidence = 0.9;
        reason = `Offer £${offer} exceeds budget ceiling £${Math.min(max, remaining)}.`;
      } else {
        vote = "counter";
        suggested_price = Math.floor(Math.min(max, remaining) * 0.9);
        reason = `Tight on budget — counter near £${suggested_price}.`;
      }
      break;
    }
    case "juror_quality": {
      const ratio = offer / Math.max(1, input.listing_price);
      if (ratio <= 0.95) {
        vote = "accept";
        reason = "Price is at or under list — quality risk is acceptable.";
        confidence = 0.7;
      } else if (ratio > 1.05) {
        vote = "reject";
        reason = "Paying above list without clear quality premium.";
        confidence = 0.75;
      } else {
        vote = "counter";
        suggested_price = Math.floor(input.listing_price * 0.92);
        reason = `Nudge toward list-relative value (~£${suggested_price}).`;
      }
      break;
    }
    case "juror_market": {
      const fair = input.listing_price * 0.9;
      if (offer <= fair) {
        vote = "accept";
        reason = `Offer is at/under estimated fair market (~£${Math.round(fair)}).`;
        confidence = 0.72;
      } else if (offer > input.listing_price * 1.1) {
        vote = "reject";
        reason = "Materially above market for this category.";
        confidence = 0.8;
      } else {
        vote = "counter";
        suggested_price = Math.round(fair);
        reason = `Market-norm counter around £${suggested_price}.`;
      }
      break;
    }
    case "juror_risk": {
      const rep =
        (Number(input.seller_reputation) + Number(input.buyer_reputation)) / 2;
      if (rep >= 55 && offer <= remaining) {
        vote = "accept";
        reason = `Counterparty reputation average ${rep.toFixed(0)} — settlement risk low.`;
        confidence = 0.68;
      } else if (rep < 40) {
        vote = "reject";
        reason = `Low average reputation (${rep.toFixed(0)}) — elevated risk.`;
        confidence = 0.77;
      } else {
        vote = "counter";
        suggested_price = Math.floor(offer * 0.95);
        reason = "Moderate risk — prefer a slightly safer price point.";
      }
      break;
    }
    case "auditor":
    default: {
      if (offer >= min && offer <= max && offer <= remaining) {
        vote = "accept";
        reason = "Within both parties' policy bands and budget.";
        confidence = 0.7;
      } else if (offer > max || offer > remaining) {
        vote = "reject";
        reason = "Violates buyer policy or remaining funds.";
        confidence = 0.85;
      } else {
        vote = "counter";
        suggested_price = Math.round(clamp((min + max) / 2, min, max));
        reason = `Policy midpoint suggests ~£${suggested_price}.`;
      }
    }
  }

  return {
    role,
    name: meta.label,
    vote,
    confidence,
    reason,
    suggested_price,
  };
}

async function aiBallot(
  role: AgentRole,
  input: CourtInput
): Promise<JurorBallot | null> {
  const meta = ROLE_BY_ID[role];
  const transcript = (input.messages || [])
    .slice(-6)
    .map((m) => `${m.from}: ${m.type} ${m.price ?? ""} — ${m.message}`)
    .join("\n");

  const result = await grokJson<{
    vote: JuryVote;
    confidence: number;
    reason: string;
    suggested_price?: number;
  }>(
    `You are a secret-ballot juror (${meta.label}) in BotMart court. ${rolePromptBias(role)}
Reply JSON only: {"vote":"accept"|"reject"|"counter","confidence":0-1,"reason":"...","suggested_price":number?}`,
    `Listing: ${input.listing_title} @ £${input.listing_price} (${input.category || "general"})
Current offer: ${input.current_offer ?? "none"}
Buyer ${input.buyer_name}: budget £${input.buyer_budget}, spent £${input.buyer_spent}, max ${input.buyer_max ?? "n/a"}, rep ${input.buyer_reputation}
Seller ${input.seller_name}: min ${input.seller_min ?? "n/a"}, rep ${input.seller_reputation}
Recent turns:
${transcript || "(none)"}`
  );

  if (!result || !result.vote) return null;
  return {
    role,
    name: meta.label,
    vote: result.vote,
    confidence: clamp(Number(result.confidence) || 0.5, 0, 1),
    reason: String(result.reason || "No reason provided").slice(0, 280),
    suggested_price:
      result.suggested_price != null ? Number(result.suggested_price) : undefined,
  };
}

function judgeFromBallots(
  ballots: JurorBallot[],
  input: CourtInput
): Pick<
  CourtSession,
  "judge_verdict" | "judge_reason" | "recommended_price"
> {
  const accept = ballots.filter((b) => b.vote === "accept").length;
  const reject = ballots.filter((b) => b.vote === "reject").length;
  const counter = ballots.filter((b) => b.vote === "counter").length;

  let judge_verdict: JuryVote = "counter";
  if (accept > reject && accept >= counter) judge_verdict = "accept";
  else if (reject > accept && reject >= counter) judge_verdict = "reject";
  else judge_verdict = "counter";

  const priceHints = ballots
    .map((b) => b.suggested_price)
    .filter((p): p is number => typeof p === "number" && p > 0);
  const recommended_price =
    priceHints.length > 0
      ? Math.round(priceHints.reduce((a, b) => a + b, 0) / priceHints.length)
      : input.current_offer ?? input.listing_price;

  const judge_reason = `Secret ballots: ${accept} accept · ${reject} reject · ${counter} counter. Majority → ${judge_verdict}.${
    judge_verdict === "counter"
      ? ` Recommended midpoint £${recommended_price}.`
      : ""
  }`;

  return { judge_verdict, judge_reason, recommended_price };
}

export async function conveneCourt(input: CourtInput): Promise<CourtSession> {
  const ballots: JurorBallot[] = [];

  for (const role of JURY_ROLES) {
    const ai = await aiBallot(role, input);
    ballots.push(ai ?? ruleBallot(role, input));
  }

  const { judge_verdict, judge_reason, recommended_price } = judgeFromBallots(
    ballots,
    input
  );

  return {
    negotiation_id: input.negotiation_id,
    listing_title: input.listing_title,
    listing_price: input.listing_price,
    current_offer: input.current_offer,
    ballots,
    accept_count: ballots.filter((b) => b.vote === "accept").length,
    reject_count: ballots.filter((b) => b.vote === "reject").length,
    counter_count: ballots.filter((b) => b.vote === "counter").length,
    judge_verdict,
    judge_reason,
    recommended_price,
    created_at: new Date().toISOString(),
  };
}
