import {
  selectArtDirection,
  inferPersonality,
  artDirectionById,
  ART_DIRECTIONS,
} from "./ai/art-direction";
import { derivePalette, seedHue } from "./ai/palette";
import { contrastRatio } from "./color";
import type { BrandGuide, ContrastCheck } from "./types";

/**
 * Upgrades a stored guide to the current shape.
 *
 * Guides are persisted as JSON, so every field the pipeline gains is a field
 * that older rows do not have. Reading one of those straight into a component
 * that expects the new shape is a crash, not a missing value — the art
 * direction block reads `artDirection.radius` and a guide written before that
 * field existed takes the whole page down.
 *
 * The migration is deliberately reconstructive rather than defensive: instead
 * of littering the UI with optional chaining, a legacy guide is brought up to
 * the current contract once, on read, by re-deriving what can be derived from
 * the brief it already carries. Everything the customer actually chose — the
 * mark, the palette, the mockups — is preserved untouched.
 */

/** Shape as it may exist on disk: anything may be missing. */
type StoredGuide = Partial<BrandGuide> & {
  strategy?: Partial<BrandGuide["strategy"]>;
};

export function needsMigration(guide: unknown): boolean {
  if (!guide || typeof guide !== "object") return false;
  const g = guide as StoredGuide;
  return (
    !g.strategy?.artDirection ||
    !g.primaryScale ||
    !g.contrastReport ||
    !g.quality
  );
}

export function migrateGuide(stored: BrandGuide): BrandGuide {
  if (!needsMigration(stored)) return stored;

  const guide = stored as StoredGuide;
  const brief = guide.brief;

  // Without a brief there is nothing to re-derive from; the guide is unusable.
  if (!brief) return stored;

  const sector = guide.strategy?.sector ?? "default";

  const direction =
    guide.strategy?.artDirection ??
    artDirectionById(
      (guide.strategy as { artDirectionId?: string } | undefined)
        ?.artDirectionId ?? "",
    ) ??
    selectArtDirection({
      name: brief.name,
      sector,
      keywords: brief.keywords,
      personality: inferPersonality(brief.keywords),
    }).direction;

  const seed =
    guide.strategy?.seed ??
    selectArtDirection({
      name: brief.name,
      sector,
      keywords: brief.keywords,
    }).seed;

  /*
   * The tonal scale is rebuilt from the palette the guide already has, so a
   * migrated guide keeps the exact colours the customer signed off on and only
   * gains the steps between them.
   */
  const existingPrimary = guide.palette?.find((s) => s.role === "primary")?.hex;
  const derived = derivePalette({
    base: existingPrimary ?? seedHue(sector, seed),
    direction,
    seed,
  });

  return {
    ...(stored as BrandGuide),
    strategy: {
      sector,
      rationale: guide.strategy?.rationale ?? "",
      voice: guide.strategy?.voice ?? {
        personality: [],
        toneDo: [],
        toneDont: [],
        tagline: "",
        positioning: "",
      },
      artDirection: direction,
      artDirectionRationale:
        guide.strategy?.artDirectionRationale ??
        `Reconstructed for an earlier version of this guide. ${direction.description}`,
      seed,
    },
    primaryScale: guide.primaryScale ?? derived.primaryScale,
    contrastReport:
      guide.contrastReport ?? rebuild(guide.palette ?? derived.swatches),
    quality: guide.quality ?? { passed: true, issues: [] },
  };
}

function rebuild(palette: BrandGuide["palette"]): ContrastCheck[] {
  const neutrals = palette.filter((s) => s.role === "neutral");
  const paper = neutrals[0]?.hex ?? "#FFFFFF";
  const ink = neutrals[neutrals.length - 1]?.hex ?? "#111111";
  const primary = palette.find((s) => s.role === "primary")?.hex ?? ink;
  const accent = palette.find((s) => s.role === "accent")?.hex ?? primary;

  return (
    [
      ["body text on paper", ink, paper, 4.5],
      ["primary on paper", primary, paper, 3],
      ["accent on paper", accent, paper, 3],
      ["paper on primary", paper, primary, 4.5],
    ] as Array<[string, string, string, number]>
  ).map(([pair, a, b, threshold]) => {
    const ratio = Math.round(contrastRatio(a, b) * 100) / 100;
    return { pair, ratio, passes: ratio >= threshold };
  });
}

export { ART_DIRECTIONS };
