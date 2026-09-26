import { grokJson } from "@/lib/grok";
import { AgentContext, decideNextAction } from "@/lib/agents/negotiate";
import { NegotiationMessage } from "@/lib/types";

type GrokMove = {
  type?: string;
  price?: number | null;
  message?: string;
};

function remaining(ctx: AgentContext) {
  return Number(ctx.budget) - Number(ctx.spent);
}

export async function decideAgentTurn(ctx: AgentContext): Promise<NegotiationMessage> {
  const grokMove = await grokJson<GrokMove>(
    `You are a ${ctx.role} commerce agent on BotMart. Reply with STRICT JSON only:
{"type":"offer"|"counter"|"accept"|"reject"|"message","price":number|null,"message":string}
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

  if (grokMove?.type && grokMove.message) {
    const type = ["offer", "counter", "accept", "reject", "message"].includes(
      String(grokMove.type)
    )
      ? (grokMove.type as NegotiationMessage["type"])
      : "message";

    let price =
      grokMove.price === null || grokMove.price === undefined
        ? undefined
        : Number(grokMove.price);

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
      message: String(grokMove.message),
      timestamp: new Date().toISOString(),
    };
  }

  return decideNextAction(ctx);
}
