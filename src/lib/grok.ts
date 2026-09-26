/**
 * AI wrapper — tries providers in priority order:
 *  1. xAI Grok    (XAI_API_KEY)
 *  2. OpenAI      (OPENAI_API_KEY)
 *  3. Rule-based  (always available, no key needed)
 */

/* ── Provider configs ─────────────────────────────────────── */
type Provider = {
  name: string;
  url: string;
  key: string;
  model: string;
};

function getProvider(): Provider | null {
  if (process.env.XAI_API_KEY) {
    return {
      name: "xAI Grok",
      url: "https://api.x.ai/v1/chat/completions",
      key: process.env.XAI_API_KEY,
      model: process.env.GROK_MODEL || "grok-3",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      name: "OpenAI",
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return {
      name: "OpenRouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || "mistralai/mistral-7b-instruct:free",
    };
  }
  return null;
}

export function aiConfigured() {
  return getProvider() !== null;
}

/* ── JSON extraction ──────────────────────────────────────── */
function extractJson(text: string): unknown | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

/* ── Main call ────────────────────────────────────────────── */
export async function grokJson<T>(
  system: string,
  user: string
): Promise<T | null> {
  const provider = getProvider();
  if (!provider) return null;

  try {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.key}`,
        // OpenRouter requires these headers
        ...(process.env.OPENROUTER_API_KEY
          ? {
              "HTTP-Referer": "https://botmart.app",
              "X-Title": "BotMart",
            }
          : {}),
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[${provider.name}] error`, res.status, err);
      return null;
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    const parsed = extractJson(content);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as T;
  } catch (err) {
    console.error(`[${provider.name}] request failed`, err);
    return null;
  }
}
