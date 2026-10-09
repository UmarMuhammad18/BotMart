/**
 * AI wrapper — tries providers in priority order:
 *  1. xAI Grok    (XAI_API_KEY)
 *  2. OpenAI      (OPENAI_API_KEY)
 *  3. OpenRouter  (OPENROUTER_API_KEY)
 *  4. Rule-based  (always available — callers handle null)
 *
 * Invalid keys (401) or network errors never throw; we just try the next provider.
 */

type Provider = {
  name: string;
  url: string;
  key: string;
  model: string;
  extraHeaders?: Record<string, string>;
};

function listProviders(): Provider[] {
  const out: Provider[] = [];

  if (process.env.XAI_API_KEY) {
    out.push({
      name: "xAI Grok",
      url: "https://api.x.ai/v1/chat/completions",
      key: process.env.XAI_API_KEY,
      model: process.env.GROK_MODEL || "grok-3",
    });
  }
  if (process.env.OPENAI_API_KEY) {
    out.push({
      name: "OpenAI",
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    });
  }
  if (process.env.OPENROUTER_API_KEY) {
    out.push({
      name: "OpenRouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || "mistralai/mistral-7b-instruct:free",
      extraHeaders: {
        "HTTP-Referer": "https://bot-mart.vercel.app",
        "X-Title": "BotMart",
      },
    });
  }

  return out;
}

export function aiConfigured() {
  return listProviders().length > 0;
}

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

async function callProvider(
  provider: Provider,
  system: string,
  user: string
): Promise<unknown | null> {
  try {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.key}`,
        ...(provider.extraHeaders || {}),
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
      const err = await res.text().catch(() => "");
      // 401 = bad key — log once, caller will try next / fall back to rules
      console.error(
        `[${provider.name}] error ${res.status}`,
        err.slice(0, 200)
      );
      return null;
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    const parsed = extractJson(content);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (err) {
    console.error(`[${provider.name}] request failed`, err);
    return null;
  }
}

/** Returns parsed JSON from the first working provider, or null. Never throws. */
export async function grokJson<T>(
  system: string,
  user: string
): Promise<T | null> {
  const providers = listProviders();
  if (providers.length === 0) return null;

  for (const provider of providers) {
    const parsed = await callProvider(provider, system, user);
    if (parsed) return parsed as T;
  }

  return null;
}
