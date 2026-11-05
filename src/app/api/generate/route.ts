import { NextResponse } from "next/server";
import { GenerateSchema, formatZodError } from "@/lib/validation";
import { generateBrandGuide } from "@/lib/ai/pipeline";
import { createProject } from "@/lib/projects";
import {
  RateLimitError,
  enforceRateLimit,
  identityFrom,
  recordGeneration,
} from "@/lib/rate-limit";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Full-guide generation. The most expensive endpoint, so the tightest quota. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const { mode, mockupCount, personality, artDirectionId, ...brief } =
    parsed.data;

  const user = isSupabaseConfigured() ? await getUser() : null;
  if (isSupabaseConfigured() && !user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const identity = identityFrom(request, user?.id);

  try {
    await enforceRateLimit(identity, "guide");
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

  await recordGeneration("guide", "started");

  try {
    const guide = await generateBrandGuide(brief, {
      mockupCount,
      personality,
      artDirectionId,
    });

    const project = await createProject({
      name: brief.name,
      industry: brief.industry,
      keywords: brief.keywords,
      audience: brief.audience,
      mode,
      guide,
      status: "complete",
    });

    await recordGeneration("guide", "succeeded", { projectId: project.id });

    return NextResponse.json({ projectId: project.id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Generation failed.";
    await recordGeneration("guide", "failed", { error: message });
    console.error("Guide generation failed:", err);

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
