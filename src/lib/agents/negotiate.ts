import { AgentPolicy, NegotiationMessage } from "@/lib/types";

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
};

/**
 * Rule-based fallback when Grok is unavailable.
 */
export function decideNextAction(ctx: AgentContext): NegotiationMessage {
  const lastMessage = ctx.messages[ctx.messages.length - 1];
  const timestamp = new Date().toISOString();
  const maxPrice = ctx.policy?.max_price;
  const minPrice = ctx.policy?.min_price;

  // ========== BUYER LOGIC ==========
  if (ctx.role === "buyer") {
    const remainingBudget = Math.min(
      ctx.budget - ctx.spent,
      maxPrice ?? Number.POSITIVE_INFINITY
    );

    // First message → make an opening offer (15-25% below asking)
    if (ctx.messages.length === 0) {
      const openingOffer = Math.round(ctx.listingPrice * 0.8);
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

      // Close enough? (within 8%) → accept
      if (sellerPrice <= ctx.listingPrice * 0.92) {
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
          ?.price || Math.round(ctx.listingPrice * 0.8);

      const newOffer = Math.round((ourLastOffer + sellerPrice) / 2);

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
    Math.round(ctx.listingPrice * 0.75)
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

    // Too low → reject or counter hard
    if (buyerPrice < minAcceptable) {
      const counter = Math.round(ctx.listingPrice * 0.9);
      return {
        from: "seller",
        type: "counter",
        price: counter,
        message: `That's too low. Lowest I can do is £${counter}.`,
        timestamp,
      };
    }

    // Good enough → accept
    if (buyerPrice >= ctx.listingPrice * 0.88) {
      return {
        from: "seller",
        type: "accept",
        price: buyerPrice,
        message: `You've got a deal at £${buyerPrice}.`,
        timestamp,
      };
    }

    // Otherwise meet in the middle
    const counter = Math.round((buyerPrice + ctx.listingPrice) / 2);
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
