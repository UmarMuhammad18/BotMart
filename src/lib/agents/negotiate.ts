import { AgentPolicy, NegotiationMessage } from "@/lib/types";
import { personalityFor } from "@/lib/agents/personality";

/** What this agent remembers about the agent across the table (memory.ts). */
export type Relationship = {
  /** 0..1: lowballs and walk-aways it holds against them. */
  grudge: number;
  /** 0..1: deals done together before. */
  loyalty: number;
  /** Short lines for the LLM prompt, newest first. */
  notes: string[];
};

export type AgentContext = {
  name: string;
  budget: number;
  spent: number;
  policy?: AgentPolicy;
  role: "buyer" | "seller";
  listingTitle: string;
  listingPrice: number;
  currentOffer: number | null;
  messages: NegotiationMessage[];
  relationship?: Relationship;
};

/** Personality numbers, nudged by history with this counterpart. */
export function tactics(ctx: AgentContext) {
  const p = personalityFor(ctx.policy?.style);
  const grudge = ctx.relationship?.grudge ?? 0;
  const loyalty = ctx.relationship?.loyalty ?? 0;
  return {
    buyer: {
      opening: p.buyer.opening - 0.05 * grudge,
      acceptAt: p.buyer.acceptAt + 0.02 * loyalty,
      concession: p.buyer.concession,
    },
    seller: {
      floor: p.seller.floor + 0.06 * grudge,
      acceptAt: p.seller.acceptAt + 0.04 * grudge - 0.03 * loyalty,
      // A sore seller gives ground more slowly
      concession: p.seller.concession * (1 - 0.4 * grudge),
    },
  };
}

/**
 * Rule-based fallback when Grok is unavailable.
 */
export function decideNextAction(ctx: AgentContext): NegotiationMessage {
  const lastMessage = ctx.messages[ctx.messages.length - 1];
  const timestamp = new Date().toISOString();
  const t = tactics(ctx);
  const maxPrice = ctx.policy?.max_price;
  const minPrice = ctx.policy?.min_price;

  // ========== BUYER LOGIC ==========
  if (ctx.role === "buyer") {
    const remainingBudget = Math.min(
      ctx.budget - ctx.spent,
      maxPrice ?? Number.POSITIVE_INFINITY
    );

    // First message → opening offer below asking (how far depends on personality)
    if (ctx.messages.length === 0) {
      const openingOffer = Math.round(ctx.listingPrice * t.buyer.opening);
      return {
        from: "buyer",
        type: "offer",
        price: Math.min(openingOffer, remainingBudget),
        message: `I'd like to buy "${ctx.listingTitle}". My opening offer is £${Math.min(openingOffer, remainingBudget)}.`,
        timestamp,
      };
    }

    // Seller accepted → we also accept
    if (lastMessage?.type === "accept") {
      return {
        from: "buyer",
        type: "accept",
        price: lastMessage.price,
        message: "Great, we have a deal!",
        timestamp,
      };
    }

    // Seller rejected → walk away
    if (lastMessage?.type === "reject") {
      return {
        from: "buyer",
        type: "reject",
        message: "Understood. I'll look elsewhere.",
        timestamp,
      };
    }

    // Seller made a counter offer
    if (lastMessage?.type === "counter" || lastMessage?.type === "offer") {
      const sellerPrice = lastMessage.price || ctx.listingPrice;

      // Can we afford it?
      if (sellerPrice > remainingBudget) {
        return {
          from: "buyer",
          type: "reject",
          message: `That's above my remaining budget of £${remainingBudget}. I have to pass.`,
          timestamp,
        };
      }

      // Close enough → accept
      if (sellerPrice <= ctx.listingPrice * t.buyer.acceptAt) {
        return {
          from: "buyer",
          type: "accept",
          price: sellerPrice,
          message: `Deal! I'll take it for £${sellerPrice}.`,
          timestamp,
        };
      }

      // Otherwise counter a bit higher than our last offer
      const ourLastOffer =
        [...ctx.messages].reverse().find((m) => m.from === "buyer" && m.price)
          ?.price || Math.round(ctx.listingPrice * t.buyer.opening);

      const newOffer = Math.round(ourLastOffer + (sellerPrice - ourLastOffer) * t.buyer.concession);

      return {
        from: "buyer",
        type: "counter",
        price: Math.min(newOffer, remainingBudget),
        message: `I can go up to £${Math.min(newOffer, remainingBudget)}. Does that work?`,
        timestamp,
      };
    }

    // Fallback
    return {
      from: "buyer",
      type: "message",
      message: "I'm still interested. What's your best price?",
      timestamp,
    };
  }

  // ========== SELLER LOGIC ==========
  const minAcceptable = Math.max(
    minPrice ?? 0,
    Math.round(ctx.listingPrice * t.seller.floor)
  );

  // Buyer accepted → confirm
  if (lastMessage?.type === "accept") {
    return {
      from: "seller",
      type: "accept",
      price: lastMessage.price,
      message: "Confirmed. Pleasure doing business.",
      timestamp,
    };
  }

  // Buyer rejected → end
  if (lastMessage?.type === "reject") {
    return {
      from: "seller",
      type: "reject",
      message: "No problem. Offer remains open for others.",
      timestamp,
    };
  }

  // Buyer made an offer / counter
  if (lastMessage?.type === "offer" || lastMessage?.type === "counter") {
    const buyerPrice = lastMessage.price || 0;

    const ourLastCounter = [...ctx.messages]
      .reverse()
      .find((m) => m.from === "seller" && m.price)?.price;

    // Too low → counter hard, but never above a price we already offered
    if (buyerPrice < minAcceptable) {
      const counter = Math.min(
        Math.round(ctx.listingPrice * Math.min(0.97, t.seller.floor + 0.15)),
        ourLastCounter ?? Number.POSITIVE_INFINITY
      );
      return {
        from: "seller",
        type: "counter",
        price: counter,
        message: `That's too low. Lowest I can do is £${counter}.`,
        timestamp,
      };
    }

    // Good enough (or matches our own last counter) → accept
    if (
      buyerPrice >= ctx.listingPrice * t.seller.acceptAt ||
      (ourLastCounter !== undefined && buyerPrice >= ourLastCounter)
    ) {
      return {
        from: "seller",
        type: "accept",
        price: buyerPrice,
        message: `You've got a deal at £${buyerPrice}.`,
        timestamp,
      };
    }

    // Otherwise move toward the buyer (half-way for a balanced seller)
    const counter = Math.min(
      Math.round(ctx.listingPrice - (ctx.listingPrice - buyerPrice) * t.seller.concession),
      ourLastCounter ?? Number.POSITIVE_INFINITY
    );
    return {
      from: "seller",
      type: "counter",
      price: counter,
      message: `I can come down to £${counter}. Final offer.`,
      timestamp,
    };
  }

  // Fallback
  return {
    from: "seller",
    type: "message",
    message: `The asking price is £${ctx.listingPrice}. What did you have in mind?`,
    timestamp,
  };
}
