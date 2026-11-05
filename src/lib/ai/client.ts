import Anthropic from "@anthropic-ai/sdk";

/**
 * Single integration point for the language model half of the pipeline.
 *
 * The generation pipeline is deliberately split in two so either half can be
 * swapped without touching the other:
 *   - reasoning + vector output (palette, typography, voice, logo SVG) → here
 *   - raster/scene composition (mockups) → `lib/ai/mockups.ts`
 */

let cached: Anthropic | null = null;

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable generation.",
    );
    this.name = "MissingApiKeyError";
  }
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new MissingApiKeyError();
  if (!cached) {
    cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cached;
}

/** The model every generation step runs on. */
export const MODEL = "claude-opus-5";

/**
 * Generation runs long enough that a non-streaming request risks an HTTP
 * timeout, so every call streams and collects the final message.
 */
export async function complete(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high" | "xhigh";
}): Promise<string> {
  const client = getClient();
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: params.maxTokens ?? 32000,
    system: params.system,
    output_config: { effort: params.effort ?? "high" },
    messages: [{ role: "user", content: params.prompt }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(
      "The model declined this brand brief. Try rephrasing the description.",
    );
  }

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { text: string }).text)
    .join("");
}

/**
 * Extracts a JSON object from a model response, tolerating prose or fenced
 * code around it.
 */
export function extractJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();

  try {
    return JSON.parse(candidate) as T;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1)) as T;
    }
    throw new Error("The model did not return parseable JSON.");
  }
}
