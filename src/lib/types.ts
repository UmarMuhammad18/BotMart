export type AgentStatus = "active" | "paused" | "blocked";
export type ListingStatus = "active" | "sold" | "inactive";
export type NegotiationStatus =
  | "open"
  | "countered"
  | "accepted"
  | "rejected"
  | "escalated";
export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled";

/** Specialized roles beyond basic buyer/seller commerce. */
export type AgentRole =
  | "buyer"
  | "seller"
  | "scout"
  | "negotiator"
  | "auditor"
  | "treasurer"
  | "juror_budget"
  | "juror_quality"
  | "juror_market"
  | "juror_risk"
  | "judge";

export type WorldActivity =
  | "idle"
  | "scouting"
  | "negotiating"
  | "settling"
  | "jury"
  | "blocked";

export type AgentPolicy = {
  max_price?: number;
  min_price?: number;
  categories?: string[];
  style?: string;
  /** Primary behavioral role in the marketplace. */
  role?: AgentRole;
};

export type AgentMemoryNote = {
  text: string;
  at: string;
  negotiation_id?: string;
};

export type Agent = {
  id: string;
  name: string;
  owner_id: string | null;
  description: string | null;
  budget: number;
  spent: number;
  policy: AgentPolicy;
  reputation: number;
  status: AgentStatus;
  goal: string | null;
  memory: AgentMemoryNote[];
  trades_completed: number;
  trades_failed: number;
  /** Optional world-map coordinates (isometric floor). */
  world_x?: number | null;
  world_z?: number | null;
  world_activity?: WorldActivity | null;
  created_at: string;
  updated_at?: string;
};

export type Listing = {
  id: string;
  seller_agent_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  stock: number;
  terms: Record<string, unknown>;
  status: ListingStatus;
  world_x?: number | null;
  world_z?: number | null;
  created_at: string;
};

export type ListingWithSeller = Listing & {
  seller: { id: string; name: string; reputation: number } | null;
  match_score?: number;
};

export type NegotiationMessage = {
  from: "buyer" | "seller";
  type: "offer" | "counter" | "accept" | "reject" | "message";
  price?: number;
  message: string;
  timestamp: string;
};

export type Negotiation = {
  id: string;
  buyer_agent_id: string;
  seller_agent_id: string;
  listing_id: string;
  status: NegotiationStatus;
  current_offer: number | null;
  messages: NegotiationMessage[];
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  negotiation_id: string;
  buyer_agent_id: string;
  seller_agent_id: string;
  listing_id: string;
  final_price: number;
  status: OrderStatus;
  created_at: string;
  stripe_payment_intent_id?: string | null;
};

export type AgentDecision = {
  id: string;
  agent_id: string;
  negotiation_id: string | null;
  role: string | null;
  action_type: string | null;
  payload: Record<string, unknown>;
  source: "rules" | "grok";
  created_at: string;
};

/** Court / jury types */
export type JuryVote = "accept" | "reject" | "counter";

export type JurorBallot = {
  role: AgentRole;
  name: string;
  vote: JuryVote;
  confidence: number;
  reason: string;
  suggested_price?: number;
};

export type CourtSession = {
  negotiation_id: string;
  listing_title: string;
  listing_price: number;
  current_offer: number | null;
  ballots: JurorBallot[];
  accept_count: number;
  reject_count: number;
  counter_count: number;
  judge_verdict: JuryVote;
  judge_reason: string;
  recommended_price: number | null;
  created_at: string;
};

/** Snapshot for the 3D world page */
export type WorldAgent = {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  activity: WorldActivity;
  x: number;
  z: number;
  budget: number;
  reputation: number;
};

export type WorldStall = {
  id: string;
  title: string;
  price: number;
  category: string | null;
  stock: number;
  status: ListingStatus;
  x: number;
  z: number;
  seller_name: string | null;
};

export type WorldEvent = {
  id: string;
  text: string;
  at: string;
  kind: "deal" | "negotiate" | "court" | "system";
};

export type WorldSnapshot = {
  agents: WorldAgent[];
  stalls: WorldStall[];
  events: WorldEvent[];
  open_negotiations: number;
  live: boolean;
};
