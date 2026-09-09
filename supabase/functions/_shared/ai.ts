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
  /**
   * Ask the provider to answer with JSON in this shape (used by
   * generate-reply).
   *
   * A schema rather than a boolean on purpose. The old `jsonMode?: boolean`
   * was silently ignored by callClaude — it was never even destructured — so
   * the reply function believed it was getting an envelope and Claude was
   * answering in prose. A required payload cannot be dropped without the
   * compiler noticing.
   */
  jsonSchema?: Record<string, unknown>;
}

export interface Completion {
  /** Raw model text. Cleanup is `_shared/completion.ts`, for every caller. */
  text: string;
  /**
   * Generation stopped because it hit `maxTokens`, not because the model
   * finished. Without this the callers cannot tell a message from the first
   * half of one, and a 140-token cap makes that a routine event rather than an
   * edge case — especially when the model spent a dozen tokens on a preamble
   * first.
   */
  truncated: boolean;
}

/**
 * One completion from whichever provider the Owner configured.
 *
 * This used to say "output cleanup is the caller's — it differs per function",
 * which is how generate-dm and generate-reply came to hold two different
 * cleaners, only one of which knew what a label was. Cleanup is now shared
 * (`./completion.ts`); what differs per caller is the character limit.
 */
export async function complete(req: CompletionRequest): Promise<Completion> {
  switch (req.provider) {
    case "claude":
      return callClaude(req);
    case "openai":
      return callOpenAI(req);
    case "gemini":
      return callGemini(req);
  }
}

async function callClaude(
  { key, system, user, maxTokens, temperature, jsonSchema }: CompletionRequest,
): Promise<Completion> {
  const post = (structured: boolean) =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        temperature,
        system,
        // Structured outputs, NOT an assistant prefill. Prefilling `{` is the
        // pattern most references still show for forcing JSON out of Claude,
        // and it returns a 400 on this model family — output_config replaced
        // it.
        ...(structured && jsonSchema
          ? { output_config: { format: { type: "json_schema", schema: jsonSchema } } }
          : {}),
        messages: [{ role: "user", content: user }],
      }),
    });

  let res = await post(true);

  // If this deployment's model or API version will not take output_config, ask
  // again without it rather than failing the request. The caller's envelope
  // parsing already copes with a model that answers in prose — that is its
  // whole job — so a rejected format parameter must not take the AI SDR's
  // inbox down with it.
  if (!res.ok && res.status === 400 && jsonSchema) {
    const detail = await res.text();
    if (detail.includes("output_config") || detail.includes("format")) {
      console.warn("[ai] Claude rejected output_config; retrying without structured output");
      res = await post(false);
    } else {
      throw new Error(`Claude API error 400: ${detail}`);
    }
  }

  if (!res.ok) throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // Optional chaining is load-bearing: an empty `content` array used to throw a
  // TypeError, which servePost turned into a 500, which stopped the Operator's
  // whole batch over one bad roll. An empty string routes into the caller's
  // existing empty-completion path, which retries and skips just that Lead.
  return {
    text: (data?.content?.[0]?.text as string) ?? "",
    truncated: data?.stop_reason === "max_tokens",
  };
}

async function callOpenAI(
  { key, system, user, maxTokens, temperature, jsonSchema }: CompletionRequest,
): Promise<Completion> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      temperature,
      ...(jsonSchema
        ? { response_format: { type: "json_schema", json_schema: { name: "reply", strict: true, schema: jsonSchema } } }
        : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const choice = data?.choices?.[0];
  return {
    text: (choice?.message?.content as string) ?? "",
    truncated: choice?.finish_reason === "length",
  };
}

async function callGemini(
  { key, system, user, maxTokens, temperature, jsonSchema }: CompletionRequest,
): Promise<Completion> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // The system prompt was previously glued onto the front of the user
        // turn, and maxTokens and temperature were not sent at all — so the 140
        // and the 0.95 that generate-dm reasons carefully about were silently
        // discarded for every Gemini Operator, and the model saw the writing
        // rules as something the prospect had said.
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
          // Mime type only. `responseSchema` wants OpenAPI-cased types here
          // rather than the JSON Schema the other two providers take, and
          // getting that wrong fails the request rather than the field.
          ...(jsonSchema ? { responseMimeType: "application/json" } : {}),
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const candidate = data?.candidates?.[0];
  // A safety block returns no parts. That used to throw, killing the batch for
  // every remaining Lead; it is a verdict on this one prospect's bio.
  return {
    text: (candidate?.content?.parts?.[0]?.text as string) ?? "",
    truncated: candidate?.finishReason === "MAX_TOKENS",
  };
}
