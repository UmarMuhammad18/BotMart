/**
 * AI layer for BotMart — built on the Vercel AI SDK + AI Gateway.
 *
 * Auth is zero-config on Vercel/v0 (OIDC), so no API key setup is needed.
 * Model IDs use the `provider/model` gateway format.
 */
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";

const MODEL = "openai/gpt-4o-mini";

export function aiConfigured() {
  // AI Gateway auth is handled automatically by the runtime.
  return true;
}

const negotiationMoveSchema = z.object({
  type: z.enum(["offer", "counter", "accept", "reject", "message"]),
  price: z.number().nullable(),
  message: z.string(),
});

export type NegotiationMove = z.infer<typeof negotiationMoveSchema>;

/**
 * Ask the model to decide the next negotiation move as structured JSON.
 * Returns null on any failure so callers can fall back to rule-based logic.
 */
export async function negotiationMove(
  system: string,
  prompt: string
): Promise<NegotiationMove | null> {
  try {
    const { object } = await generateObject({
      model: MODEL,
      schema: negotiationMoveSchema,
      system,
      prompt,
      temperature: 0.3,
      abortSignal: AbortSignal.timeout(20000),
    });
    return object;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) {
      console.error("[ai] model did not return a valid object", err.message);
    } else {
      console.error("[ai] negotiationMove failed", err);
    }
    return null;
  }
}

const searchFiltersSchema = z.object({
  keywords: z.string(),
  maxPrice: z.number().nullable(),
  category: z.enum(["electronics", "software", "data", "compute"]).nullable(),
});

export type ExtractedSearchFilters = z.infer<typeof searchFiltersSchema>;

/**
 * Extract structured shopping filters from a free-text buyer goal.
 */
export async function extractSearchFilters(
  goal: string,
  buyerPolicy: Record<string, unknown>
): Promise<ExtractedSearchFilters | null> {
  try {
    const { object } = await generateObject({
      model: MODEL,
      schema: searchFiltersSchema,
      system: "Extract shopping filters from a buyer's stated goal on an agent marketplace.",
      prompt: `Goal: ${goal}\nBuyer policy: ${JSON.stringify(buyerPolicy)}`,
      temperature: 0.2,
      abortSignal: AbortSignal.timeout(20000),
    });
    return object;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) {
      console.error("[ai] model did not return a valid object", err.message);
    } else {
      console.error("[ai] extractSearchFilters failed", err);
    }
    return null;
  }
}
