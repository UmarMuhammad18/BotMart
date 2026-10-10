export type AgentStatus = "active" | "paused" | "blocked";

export type AgentRole =
  | "buyer"
  | "seller"
  | "scout"
  | "negotiator"
  | "auditor"
  | "treasurer"
  | "juror_a"
  | "juror_b"
  | "juror_c"
  | "judge";

export type WorldActivity =
  | "idle"
  | "scouting"
  | "negotiating"
  | "jury"
  | "blocked";

export type ListingStatus = "active" | "sold" | "paused" | "draft";

export type AgentPolicy = {
  role?: AgentRole;
  max_price?: number;
  min_price?: number;
  categories?: string[];
  style?: string;
};

export type Agent = {
  id: string;
  name: string;
  owner_id?: string | null;
  description?: string | null;
  budget: number;
  spent: number;
  policy?: AgentPolicy;
  reputation?: number;
  status: AgentStatus;
  goal?: string | null;
  memory?: unknown;
  trades_completed?: number;
  trades_failed?: number;
  world_x?: number | null;
  world_z?: number | null;
  world_activity?: WorldActivity | null;
  created_at?: string;
  updated_at?: string;
};

export type Listing = {
  id: string;
  seller_agent_id: string;
  title: string;
  description?: string | null;
  price: number;
  category?: string | null;
  stock: number;
  terms?: Record<string, unknown>;
  status: ListingStatus;
  world_x?: number | null;
  world_z?: number | null;
  created_at?: string;
};

export type NegotiationMessage = {
  from: "buyer" | "seller";
  type: "offer" | "counter" | "accept" | "reject" | "message";
  price?: number;
  message: string;
  timestamp: string;
};

export type WorldAgent = {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  activity: WorldActivity;
  x: number;
  z: number;
  budget: number;
  spent: number;
  reputation: number;
  goal: string | null;
  target_stall_id?: string | null;
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
  seller_id?: string | null;
};

export type WorldEvent = {
  id: string;
  text: string;
  at: string;
  kind: "deal" | "negotiate" | "court" | "system";
};

export type WorldDealPopup = {
  id: string;
  x: number;
  z: number;
  label: string;
  at: string;
};

export type WorldLink = {
  agent_id: string;
  stall_id: string;
};

export type WorldSnapshot = {
  agents: WorldAgent[];
  stalls: WorldStall[];
  events: WorldEvent[];
  links: WorldLink[];
  deal_popups: WorldDealPopup[];
  open_negotiations: number;
  live: boolean;
};
