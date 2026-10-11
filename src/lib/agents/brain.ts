import { grokJson } from "@/lib/grok";
import { AgentContext, decideNextAction } from "@/lib/agents/negotiate";
import { NegotiationMessage } from "@/lib/types";

type GrokMove = {
  type?: string;
  price?: number | null;
  message?: string;
};

export type AgentTurn = {
  move: NegotiationMessage;
  source: "grok" | "rules";
};

const MOVE_TYPES = ["offer", "counter", "accept", "reject", "message"];

function remaining(ctx: AgentContext) {
  return Number(ctx.budget) - Number(ctx.spent);
}

/** Most recent price put on the table by the other side. */
export function counterpartyPrice(ctx: AgentContext): number | undefined {
  const other = ctx.role === "buyer" ? "seller" : "buyer";
  const last = [...ctx.messages]
    .reverse()
    .find((m) => m.from === other && m.price != null);
  return last?.price ?? undefined;
}

/**
 * Turn a raw AI move into a legal one, or null if it can't be made legal.
 * - accept always settles at the counterparty's last price (never a price the
 *   accepting side invents)
 * - buyers can't offer or accept above remaining budget / policy.max_price
 * - sellers can't accept below policy.min_price
 */
export function sanitizeMove(
  ctx: AgentContext,
  raw: GrokMove
): NegotiationMessage | null {
  if (!raw?.type || !raw.message) return null;

  const type = MOVE_TYPES.includes(String(raw.type))
    ? (raw.type as NegotiationMessage["type"])
    : "message";

  const buyerCap =
    ctx.role === "buyer"
      ? Math.min(
          remaining(ctx),
          ctx.policy?.max_price
            ? Number(ctx.policy.max_price)
            : Number.POSITIVE_INFINITY
        )
      : Number.POSITIVE_INFINITY;

  let price: number | undefined;

  if (type === "accept") {
    price = counterpartyPrice(ctx);
    if (price === undefined) return null;
    if (price > buyerCap) return null;
    if (
      ctx.role === "seller" &&
      ctx.policy?.min_price &&
      price < Number(ctx.policy.min_price)
    ) {
      return null;
    }
  } else if (raw.price !== null && raw.price !== undefined) {
    price = Number(raw.price);
    if (!Number.isFinite(price) || price <= 0) return null;
    if (ctx.role === "buyer") price = Math.min(price, buyerCap);
  }

  return {
    from: ctx.role,
    type,
    price,
    message: String(raw.message),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Prefer AI move; on any failure (bad key, timeout, bad JSON, illegal move)
 * use the rule engine. Never throws.
 */
export async function decideAgentTurn(ctx: AgentContext): Promise<AgentTurn> {
  try {
    const grokMove = await grokJson<GrokMove>(
      `You are a ${ctx.role} commerce agent on BotMart. Reply with STRICT JSON only:
{"type":"offer"|"counter"|"accept"|"reject"|"message","price":number|null,"message":string}
Rules:
- Stay in character. Be concise.
- Buyer must not offer above remaining budget.
- Seller must not accept below policy.min_price if set.
- Buyer should respect policy.max_price if set.
- "accept" means accepting the other side's latest price exactly.
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

    const move = grokMove ? sanitizeMove(ctx, grokMove) : null;
    if (move) return { move, source: "grok" };
  } catch (err) {
    console.error("[brain] AI path failed, using rules", err);
  }

  return { move: decideNextAction(ctx), source: "rules" };
}
