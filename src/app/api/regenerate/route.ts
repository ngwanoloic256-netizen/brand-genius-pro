import { NextResponse } from "next/server";
import { RegenerateSchema, formatZodError } from "@/lib/validation";
import { getProject, updateProject } from "@/lib/projects";
import { generateStrategy } from "@/lib/ai/strategy";
import {
  buildLogoVariants,
  fallbackMark,
  generateMark,
} from "@/lib/ai/logo";
import { markFromImportedLogo } from "@/lib/ai/pipeline";
import { buildSceneContext, generateMockups } from "@/lib/ai/mockups";
import { enforceQuality } from "@/lib/ai/quality";
import {
  RateLimitError,
  enforceRateLimit,
  identityFrom,
  recordGeneration,
} from "@/lib/rate-limit";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { BrandGuide } from "@/lib/types";

/**
 * Regenerates one section of an existing guide, leaving the others untouched.
 *
 * The pipeline stages are independent by design, so "regenerate the mockups"
 * costs a scene re-render rather than a whole new identity.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = RegenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const { projectId, section } = parsed.data;

  const user = isSupabaseConfigured() ? await getUser() : null;
  if (isSupabaseConfigured() && !user) {
    return NextResponse.json({ error: "Connectez-vous pour continuer." }, { status: 401 });
  }

  // RLS scopes this read to the caller, so a project they cannot see is a 404.
  const project = await getProject(projectId);
  if (!project?.guide) {
    return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  }

  const identity = identityFrom(request, user?.id);
  try {
    await enforceRateLimit(identity, section);
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

  await recordGeneration(section, "started", { projectId });

  try {
    const next = await regenerateSection(project.guide, section);
    // Regenerating one section can break a rule the whole system passed before
    // — a new palette has to clear contrast just like the original did.
    const { guide, report } = enforceQuality(next);
    await updateProject(projectId, { guide: { ...guide, quality: report } });
    await recordGeneration(section, "succeeded", { projectId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "La nouvelle création a échoué.";
    await recordGeneration(section, "failed", { projectId, error: message });
    console.error(`Regeneration of ${section} failed:`, err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function regenerateSection(
  guide: BrandGuide,
  section: "palette" | "typography" | "logo" | "mockups",
): Promise<BrandGuide> {
  const { brief, strategy } = guide;

  if (section === "palette" || section === "typography") {
    // The art direction is pinned. Regenerating a palette must give a new
    // palette, not a new brand — letting the direction be reselected here
    // would silently change the geometry, the type classes and the mockup
    // treatment too.
    const next = await generateStrategy(brief, {
      artDirectionId: strategy.artDirection.id,
    });
    const palette = section === "palette" ? next.palette : guide.palette;
    const typography =
      section === "typography" ? next.typography : guide.typography;

    // Recolouring the palette or swapping the wordmark's family changes every
    // downstream artefact, so the lockups and scenes are rebuilt from the
    // stored mark rather than left stale.
    const ctx = buildSceneContext(
      brief.name,
      next.strategy.voice.tagline,
      guide.mark.markup,
      palette,
      typography,
    );

    return {
      ...guide,
      strategy: next.strategy,
      palette,
      typography,
      logo: buildLogoVariants(brief, guide.mark, palette, typography),
      mockups: generateMockups(
        ctx,
        next.strategy.sector,
        guide.mockups.length || 8,
        next.strategy.artDirection,
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  if (section === "logo") {
    const mark = brief.importedLogo
      ? markFromImportedLogo(brief.importedLogo, brief)
      : await generateMark(brief, strategy.sector, strategy.artDirection).catch(() =>
          fallbackMark(brief),
        );

    const ctx = buildSceneContext(
      brief.name,
      strategy.voice.tagline,
      mark.markup,
      guide.palette,
      guide.typography,
    );

    return {
      ...guide,
      mark,
      logo: buildLogoVariants(brief, mark, guide.palette, guide.typography),
      // A new mark means every scene showing it is now wrong.
      mockups: generateMockups(
        ctx,
        strategy.sector,
        guide.mockups.length || 8,
        strategy.artDirection,
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  // Mockups only: keep the existing mark so the scenes stay on-brand.
  const ctx = buildSceneContext(
    brief.name,
    strategy.voice.tagline,
    guide.mark.markup,
    guide.palette,
    guide.typography,
  );

  return {
    ...guide,
    mockups: generateMockups(
      ctx,
      strategy.sector,
      guide.mockups.length || 8,
      strategy.artDirection,
    ),
    generatedAt: new Date().toISOString(),
  };
}
