export type Agent = {
  id: string;
  name: string;
  owner_id: string | null;
  description: string | null;
  budget: number;
  spent: number;
  policy: Record<string, any>;
  reputation: number;
  status: "active" | "paused" | "blocked";
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
  terms: Record<string, any>;
  status: "active" | "sold" | "inactive";
  created_at: string;
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
  status: "open" | "accepted" | "rejected" | "escalated";
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
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  created_at: string;
};
