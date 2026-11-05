import { generateStrategy, fallbackStrategy, detectSector } from "./strategy";
import {
  buildLogoUsage,
  buildLogoVariants,
  fallbackMark,
  generateMark,
  sanitizeMarkup,
  type MarkSpec,
} from "./logo";
import { buildSceneContext, generateMockups } from "./mockups";
import { enforceQuality } from "./quality";
import {
  inferPersonality,
  selectArtDirection,
  type Personality,
} from "./art-direction";
import type { BrandBrief, BrandDirection, BrandGuide } from "../types";

/**
 * The generation pipeline.
 *
 *   brand brief (or imported logo)
 *     → strategy  : sector, voice, palette, typography
 *     → logo      : one vector mark, composed into five variants
 *     → mockups   : contextual scenes, variety-enforced
 *     → guide     : the object the charte page and PDF export both read
 *
 * Each stage is independently callable so the UI can regenerate one section
 * without rebuilding the whole identity.
 */

export type PipelineStage =
  | "analyzing"
  | "palette"
  | "typography"
  | "logo"
  | "mockups"
  | "done";

export const STAGE_LABELS: Record<PipelineStage, string> = {
  analyzing: "Analysing the brand",
  palette: "Building the colour palette",
  typography: "Selecting typography",
  logo: "Drawing the logo system",
  mockups: "Generating mockups",
  done: "Finishing up",
};

export interface GenerateOptions {
  /** How many mockups to produce. */
  mockupCount?: number;
  /** Explicit art direction, when the user chose one in the wizard. */
  artDirectionId?: string;
  /** Explicit personality sliders. */
  personality?: Personality;
  /** Called as each stage completes — used to drive the wizard's progress UI. */
  onStage?: (stage: PipelineStage) => void;
}

/**
 * Normalises a brief before anything downstream touches it.
 *
 * An uploaded logo is sanitised here, at the boundary, so the guide that gets
 * persisted — and re-serialised to every client that opens the project — holds
 * safe markup rather than the raw upload. The sanitiser still runs at render
 * time; this makes that the second line of defence instead of the only one.
 */
function normalizeBrief(brief: BrandBrief): BrandBrief {
  if (!brief.importedLogo) return brief;

  const inner = extractSvgInner(brief.importedLogo);
  const markup = inner ? sanitizeMarkup(inner) : "";

  if (!markup) {
    // Nothing usable survived — drop the field rather than carry the raw file.
    const rest = { ...brief };
    delete rest.importedLogo;
    return rest;
  }

  return {
    ...brief,
    importedLogo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${markup}</svg>`,
  };
}

export async function generateBrandGuide(
  input: BrandBrief,
  options: GenerateOptions = {},
): Promise<BrandGuide> {
  const { mockupCount = 8, onStage } = options;
  const brief = normalizeBrief(input);

  onStage?.("analyzing");
  const { strategy, palette, primaryScale, contrastReport, typography } =
    await generateStrategy(brief, {
      artDirectionId: options.artDirectionId,
      personality: options.personality,
    });

  onStage?.("palette");
  onStage?.("typography");

  onStage?.("logo");
  const mark = brief.importedLogo
    ? markFromImportedLogo(brief.importedLogo, brief)
    : await generateMark(brief, strategy.sector, strategy.artDirection);

  const logo = buildLogoVariants(brief, mark, palette, typography);
  const logoUsage = buildLogoUsage(brief);

  onStage?.("mockups");
  const ctx = buildSceneContext(
    brief.name,
    strategy.voice.tagline,
    mark.markup,
    palette,
    typography,
  );
  const mockups = generateMockups(
    ctx,
    strategy.sector,
    mockupCount,
    strategy.artDirection,
  );

  onStage?.("done");

  // Every identity goes through the gates before it is handed over.
  const { guide, report } = enforceQuality({
    brief,
    strategy,
    palette,
    primaryScale,
    contrastReport,
    typography,
    mark,
    logo,
    logoUsage,
    mockups,
    quality: { passed: true, issues: [] },
    generatedAt: new Date().toISOString(),
  });

  if (!report.passed) {
    console.error(
      "Generated identity failed quality gates:",
      report.issues.filter((i) => i.severity === "blocking"),
    );
  }

  return { ...guide, quality: report };
}

/**
 * Imported-logo path: the uploaded SVG becomes the mark, so every derived
 * variant and mockup carries the customer's existing identity rather than a
 * newly invented one.
 */
export function markFromImportedLogo(
  source: string,
  brief: BrandBrief,
): MarkSpec {
  const inner = extractSvgInner(source);

  // No <svg> root, or nothing left after sanitising: fall back to a generated
  // monogram rather than embedding the raw upload. Referencing the original
  // file would put unsanitised user input back into the DOM, which is the one
  // thing the sanitiser exists to prevent.
  const markup = inner ? sanitizeMarkup(inner) : "";
  if (!/<(path|circle|rect|polygon|polyline|ellipse|line|g|text)\b/i.test(markup)) {
    return fallbackMark(brief);
  }

  return {
    concept: "Imported logo, normalised to the brand's coordinate system.",
    markup,
    lockup: "horizontal",
  };
}

/** Pulls the children out of an SVG string and rescales them to a 100×100 box. */
function extractSvgInner(source: string): string | null {
  const match = source.match(/<svg([^>]*)>([\s\S]*)<\/svg>/i);
  if (!match) return null;

  const attrs = match[1];
  const inner = match[2];

  const viewBox = attrs.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!viewBox) return inner;

  const [minX, minY, width, height] = viewBox[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);

  if (!width || !height) return inner;

  const scale = 100 / Math.max(width, height);
  const offsetX = (100 - width * scale) / 2 - minX * scale;
  const offsetY = (100 - height * scale) / 2 - minY * scale;

  return `<g transform="translate(${offsetX.toFixed(2)}, ${offsetY.toFixed(2)}) scale(${scale.toFixed(4)})">${inner}</g>`;
}

/* -------------------------------------------------------------------------- */
/*  Art directions (wizard step 3)                                            */
/* -------------------------------------------------------------------------- */

/**
 * Produces the direction options shown in the wizard.
 *
 * Each option is a genuinely different *art direction* — different geometry,
 * type classes and colour harmony — rather than the same system under a
 * rotated hue. That is the point of the profile library: the choice a user
 * makes here has to change the brand, not tint it.
 */
export async function generateDirections(
  input: BrandBrief,
  options: { personality?: Personality } = {},
): Promise<BrandDirection[]> {
  const brief = normalizeBrief(input);
  const sector = detectSector(`${brief.industry} ${brief.keywords}`);

  const selection = selectArtDirection({
    name: brief.name,
    sector,
    keywords: brief.keywords,
    personality: options.personality ?? inferPersonality(brief.keywords),
  });

  const candidates = [selection.direction, ...selection.alternatives].slice(0, 4);

  const mark = brief.importedLogo
    ? markFromImportedLogo(brief.importedLogo, brief)
    : await generateMark(brief, sector).catch(() => fallbackMark(brief));

  return candidates.map((direction) => {
    // Each preview is built by the real pipeline under that direction, so what
    // the user picks is exactly what they get.
    const derived = fallbackStrategy(brief, { artDirectionId: direction.id });
    const [primaryVariant] = buildLogoVariants(
      brief,
      mark,
      derived.palette,
      derived.typography,
    );

    return {
      id: direction.id,
      name: direction.name,
      description: direction.description,
      palette: derived.palette,
      typography: derived.typography,
      logo: primaryVariant,
    };
  });
}

export { detectSector };
