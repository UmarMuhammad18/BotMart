import type { AgentRole } from "@/lib/types";

export type RoleMeta = {
  id: AgentRole;
  label: string;
  blurb: string;
  color: string;
  /** Hex for 3D mesh tint */
  hex: string;
};

export const ROLE_CATALOG: RoleMeta[] = [
  {
    id: "buyer",
    label: "Buyer",
    blurb: "Searches listings and opens negotiations under budget.",
    color: "text-indigo-300",
    hex: "#818cf8",
  },
  {
    id: "seller",
    label: "Seller",
    blurb: "Lists inventory and counters offers to protect margin.",
    color: "text-emerald-300",
    hex: "#34d399",
  },
  {
    id: "scout",
    label: "Scout",
    blurb: "Finds undervalued listings and surfaces match scores.",
    color: "text-cyan-300",
    hex: "#22d3ee",
  },
  {
    id: "negotiator",
    label: "Negotiator",
    blurb: "Specialist haggler — tighter multi-turn strategy.",
    color: "text-violet-300",
    hex: "#a78bfa",
  },
  {
    id: "auditor",
    label: "Auditor",
    blurb: "Reviews fairness, reputation, and policy compliance.",
    color: "text-amber-300",
    hex: "#fbbf24",
  },
  {
    id: "treasurer",
    label: "Treasurer",
    blurb: "Hard budget guard — vetoes overspend risk.",
    color: "text-rose-300",
    hex: "#fb7185",
  },
  {
    id: "juror_budget",
    label: "Budget Juror",
    blurb: "Votes on whether the price fits the buyer budget.",
    color: "text-pink-300",
    hex: "#f472b6",
  },
  {
    id: "juror_quality",
    label: "Quality Juror",
    blurb: "Votes on listing quality vs asking price.",
    color: "text-sky-300",
    hex: "#38bdf8",
  },
  {
    id: "juror_market",
    label: "Market Juror",
    blurb: "Votes using category norms and relative value.",
    color: "text-lime-300",
    hex: "#a3e635",
  },
  {
    id: "juror_risk",
    label: "Risk Juror",
    blurb: "Votes on counterparty and settlement risk.",
    color: "text-orange-300",
    hex: "#fb923c",
  },
  {
    id: "judge",
    label: "Judge",
    blurb: "Aggregates secret ballots into a final verdict.",
    color: "text-yellow-200",
    hex: "#fde68a",
  },
];

export const ROLE_BY_ID = Object.fromEntries(
  ROLE_CATALOG.map((r) => [r.id, r])
) as Record<AgentRole, RoleMeta>;

export function resolveRole(
  policy?: { role?: AgentRole } | null,
  fallback: AgentRole = "buyer"
): AgentRole {
  return policy?.role && ROLE_BY_ID[policy.role] ? policy.role : fallback;
}

export const JURY_ROLES: AgentRole[] = [
  "juror_budget",
  "juror_quality",
  "juror_market",
  "juror_risk",
  "auditor",
];

export function rolePromptBias(role: AgentRole): string {
  switch (role) {
    case "scout":
      return "You prioritize discovery and value. Flag bargains aggressively.";
    case "negotiator":
      return "You are a specialist negotiator. Use multi-turn leverage.";
    case "auditor":
      return "You care about fairness and policy. Reject shady terms.";
    case "treasurer":
      return "Never exceed budget. Prefer walking away over overspend.";
    case "juror_budget":
      return "Vote only on budget fit. Accept if affordable with buffer.";
    case "juror_quality":
      return "Vote on quality vs price. Reject overpriced junk.";
    case "juror_market":
      return "Vote on market fairness vs typical category prices.";
    case "juror_risk":
      return "Vote on counterparty risk and settlement safety.";
    case "judge":
      return "Aggregate jury ballots. Prefer majority; break ties conservatively.";
    case "seller":
      return "Protect margin while closing reasonable deals.";
    case "buyer":
default:
      return "Stay within budget and policy. Seek fair value.";
  }
}
