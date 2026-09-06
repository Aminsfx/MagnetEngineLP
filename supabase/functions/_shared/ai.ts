// Shared AI provider calls.
//
// generate-dm and generate-reply each carried their own callClaude/callOpenAI/
// callGemini and a byte-identical provider-fallback loop, differing only in
// max_tokens, temperature and whether JSON mode was on.

export const PROVIDERS = ["claude", "openai", "gemini"] as const;
export type Provider = (typeof PROVIDERS)[number];

const PROVIDER_ENV: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  claude: "CLAUDE_API_KEY",
  gemini: "GEMINI_API_KEY",
};

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

export interface ResolvedProvider {
  /** The provider that will actually run — not necessarily the one requested. */
  provider: Provider;
  key: string;
}

/**
 * Resolve the key for the requested provider, falling back to any other
 * configured one. Returns null when the Owner has configured none.
 *
 * The fallback means the caller's `selectedAIProvider` is a preference, not a
 * guarantee — which is why the response reports which provider actually ran.
 */
export function resolveProvider(requested: Provider): ResolvedProvider | null {
  const direct = Deno.env.get(PROVIDER_ENV[requested]);
  if (direct) return { provider: requested, key: direct };

  for (const p of PROVIDERS) {
    const key = Deno.env.get(PROVIDER_ENV[p]);
    if (key) return { provider: p, key };
  }
  return null;
}

export const NO_PROVIDER_ERROR =
  "No AI provider key configured on the server. Set CLAUDE_API_KEY (or OPENAI_API_KEY / GEMINI_API_KEY) via supabase secrets set.";

export interface CompletionRequest {
  provider: Provider;
  key: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  /** Ask the provider for a JSON object (used by generate-reply). */
  jsonMode?: boolean;
}

/** Raw model text. Output cleanup is the caller's — it differs per function. */
export async function complete(req: CompletionRequest): Promise<string> {
  switch (req.provider) {
    case "claude":
      return callClaude(req);
    case "openai":
      return callOpenAI(req);
    case "gemini":
      return callGemini(req);
  }
}

async function callClaude({ key, system, user, maxTokens, temperature }: CompletionRequest): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content[0].text as string;
}

async function callOpenAI({ key, system, user, maxTokens, temperature, jsonMode }: CompletionRequest): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      temperature,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content as string;
}

async function callGemini({ key, system, user, jsonMode }: CompletionRequest): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
        ...(jsonMode ? { generationConfig: { responseMimeType: "application/json" } } : {}),
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini API");
  return text as string;
}
