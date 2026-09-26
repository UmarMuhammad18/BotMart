export type AgentStatus = "active" | "paused" | "blocked";
export type ListingStatus = "active" | "sold" | "inactive";
export type NegotiationStatus = "open" | "countered" | "accepted" | "rejected" | "escalated";
export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled";

export type AgentPolicy = {
  max_price?: number;
  min_price?: number;
  categories?: string[];
  style?: string;
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
  created_at: string;
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
