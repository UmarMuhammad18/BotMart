import { negotiationMove } from "@/lib/ai";
import { AgentContext, decideNextAction } from "@/lib/agents/negotiate";
import { NegotiationMessage } from "@/lib/types";

function remaining(ctx: AgentContext) {
  return Number(ctx.budget) - Number(ctx.spent);
}

export async function decideAgentTurn(ctx: AgentContext): Promise<NegotiationMessage> {
  const move = await negotiationMove(
    `You are a ${ctx.role} commerce agent on BotMart.
Rules:
- Stay in character. Be concise.
- Buyer must not offer above remaining budget.
- Seller must not accept below policy.min_price if set.
- Buyer should respect policy.max_price if set.
- Use accept only when the last price is genuinely good.
- Use reject to walk away.
- Prefer counter over endless chat.`,
    `Agent: ${ctx.name}
Role: ${ctx.role}
Budget: ${ctx.budget}
Spent: ${ctx.spent}
Remaining: ${remaining(ctx)}
Policy: ${JSON.stringify(ctx.policy || {})}
Listing: ${ctx.listingTitle}
Asking price: ${ctx.listingPrice}
Current offer: ${ctx.currentOffer}
History: ${JSON.stringify(ctx.messages)}
Decide the next action.`
  );

  if (move?.type && move.message) {
    const type = move.type as NegotiationMessage["type"];

    let price =
      move.price === null || move.price === undefined
        ? undefined
        : Number(move.price);

    if (ctx.role === "buyer" && price !== undefined) {
      price = Math.min(price, remaining(ctx));
      if (ctx.policy?.max_price) price = Math.min(price, ctx.policy.max_price);
    }

    if (ctx.role === "seller" && type === "accept" && ctx.policy?.min_price && price) {
      if (price < ctx.policy.min_price) {
        return decideNextAction(ctx);
      }
    }

    return {
      from: ctx.role,
      type,
      price,
      message: String(move.message),
      timestamp: new Date().toISOString(),
    };
  }

  return decideNextAction(ctx);
}
