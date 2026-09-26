const XAI_URL = "https://api.x.ai/v1/chat/completions";

export function grokConfigured() {
  return Boolean(process.env.XAI_API_KEY || process.env.GROK_API_KEY);
}

function grokKey() {
  return process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
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

export async function grokJson<T>(
  system: string,
  user: string
): Promise<T | null> {
  const apiKey = grokKey();
  if (!apiKey) return null;

  const model = process.env.GROK_MODEL || "grok-3";

  try {
    const res = await fetch(XAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
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
      console.error("Grok error", res.status, err);
      return null;
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    const parsed = extractJson(content);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as T;
  } catch (err) {
    console.error("Grok request failed", err);
    return null;
  }
}
