import { NextResponse } from "next/server";
import { z } from "zod";
import { DirectionsSchema, formatZodError } from "@/lib/validation";
import { generateDirections } from "@/lib/ai/pipeline";
import {
  RateLimitError,
  enforceRateLimit,
  identityFrom,
  recordGeneration,
} from "@/lib/rate-limit";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Produces the aesthetic directions shown in wizard step 3.
 *
 * Route handlers are uncached by default in this Next version, which is what
 * we want — every brief must hit the pipeline.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = DirectionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const user = isSupabaseConfigured() ? await getUser() : null;
  if (isSupabaseConfigured() && !user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const identity = identityFrom(request, user?.id);

  try {
    await enforceRateLimit(identity, "directions");
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: err.message },
        {
          status: 429,
          headers: { "Retry-After": String(err.retryAfterSeconds) },
        },
      );
    }
    throw err;
  }

  await recordGeneration("directions", "started");

  try {
    const { personality, ...brief } = parsed.data;
    const directions = await generateDirections(brief, { personality });
    await recordGeneration("directions", "succeeded");
    return NextResponse.json({ directions });
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? "The model returned an unexpected shape. Try again."
        : err instanceof Error
          ? err.message
          : "Generation failed.";

    await recordGeneration("directions", "failed", { error: message });
    console.error("Directions generation failed:", err);

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
