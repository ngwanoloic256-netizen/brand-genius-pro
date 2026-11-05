import {
  contrastRatio,
  hexToOklch,
  hexToRgb,
  isOutOfGamut,
  normalizeHex,
  oklchToHex,
  readableOn,
  rgbToCmyk,
  type OKLCH,
} from "../color";
import type { ArtDirection, ColorHarmony } from "./art-direction";
import type { ColorRole, ColorSwatch } from "../types";

/**
 * Palette derivation.
 *
 * A palette is never "a list of colours" here — it is a set of *roles* derived
 * from one seed hue by rules the art direction chooses. The harmony, the
 * saturation ceiling and the neutral temperature all come from the profile, so
 * two brands built on the same hue still diverge if their directions differ.
 *
 * Everything happens in OKLCH. Stepping lightness evenly in HSL produces a
 * scale that looks wrong — the mid tones bunch up and the light end goes chalky
 * — because HSL lightness is not perceptual. Chroma is also pulled back at both
 * ends of the scale, since a tint that keeps full chroma reads as dirty pastel
 * rather than as a lighter version of the same colour.
 */

/** Tonal steps, in the convention designers already expect. */
export const SCALE_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

export type ScaleStep = (typeof SCALE_STEPS)[number];
export type ColorScale = Record<ScaleStep, string>;

/** Target lightness per step. Tuned by eye, not linear. */
const STEP_LIGHTNESS: Record<ScaleStep, number> = {
  50: 0.975,
  100: 0.94,
  200: 0.88,
  300: 0.8,
  400: 0.71,
  500: 0.62,
  600: 0.53,
  700: 0.44,
  800: 0.35,
  900: 0.26,
  950: 0.18,
};

/**
 * Chroma multiplier per step. Held near full through the mid range and pulled
 * back at both ends, which is what keeps 50 from looking like dirty pastel and
 * 950 from turning into a muddy near-black.
 */
const STEP_CHROMA: Record<ScaleStep, number> = {
  50: 0.18,
  100: 0.32,
  200: 0.55,
  300: 0.78,
  400: 0.94,
  500: 1,
  600: 0.98,
  700: 0.9,
  800: 0.78,
  900: 0.62,
  950: 0.45,
};

const SATURATION_CEILING: Record<ArtDirection["color"]["saturation"], number> = {
  low: 0.09,
  medium: 0.15,
  high: 0.21,
};

/** Builds the full 50→950 scale for a hue. */
export function buildScale(base: OKLCH, saturationCeiling: number): ColorScale {
  const chroma = Math.min(base.c, saturationCeiling);
  const scale = {} as ColorScale;

  for (const step of SCALE_STEPS) {
    scale[step] = oklchToHex({
      l: STEP_LIGHTNESS[step],
      c: chroma * STEP_CHROMA[step],
      h: base.h,
    });
  }
  return scale;
}

/** Hue offset for each harmony, in degrees. */
function harmonyOffsets(harmony: ColorHarmony): {
  secondary: number;
  accent: number;
} {
  switch (harmony) {
    case "monochrome":
      return { secondary: 0, accent: 0 };
    case "analogous":
      return { secondary: 30, accent: -28 };
    case "complementary":
      return { secondary: 180, accent: 180 };
    case "triadic":
      return { secondary: 120, accent: -120 };
    case "split-complementary":
    default:
      return { secondary: 150, accent: -150 };
  }
}

function swatch(
  name: string,
  hex: string,
  role: ColorRole,
  usage: string,
): ColorSwatch {
  const normalized = normalizeHex(hex);
  const rgb = hexToRgb(normalized);
  return {
    name,
    hex: normalized,
    rgb,
    cmyk: rgbToCmyk(rgb),
    role,
    usage,
    onColor: readableOn(normalized),
  };
}

export interface PaletteResult {
  swatches: ColorSwatch[];
  /** Full tonal scale for the primary, exported in the guide. */
  primaryScale: ColorScale;
  /** Colours that had to be desaturated to be printable or displayable. */
  gamutWarnings: string[];
  contrastReport: Array<{ pair: string; ratio: number; passes: boolean }>;
}

export interface PaletteInput {
  /** Seed hue, as hex. Usually derived from the sector or supplied by the user. */
  base: string;
  direction: ArtDirection;
  seed: number;
  /** Names for the swatches, so the palette does not read as "Primary Blue". */
  names?: Partial<Record<ColorRole | "accent2", string>>;
}

export function derivePalette(input: PaletteInput): PaletteResult {
  const { direction, seed } = input;
  const ceiling = SATURATION_CEILING[direction.color.saturation];
  const base = hexToOklch(input.base);
  const offsets = harmonyOffsets(direction.color.harmony);

  const primaryScale = buildScale(base, ceiling);

  // Primary sits mid-scale on light surfaces, and lighter on dark ones so the
  // brand colour stays legible against its own background.
  const primaryHex = direction.color.darkSurface
    ? primaryScale[400]
    : primaryScale[600];

  const secondaryBase: OKLCH = {
    l: direction.color.darkSurface ? 0.32 : 0.38,
    c: Math.min(base.c, ceiling) * 0.8,
    h: (base.h + offsets.secondary + 360) % 360,
  };

  /*
   * The accent must be *noticed*, so it keeps more chroma and is pushed away in
   * lightness from the primary rather than only in hue.
   *
   * A small seed-driven rotation keeps two brands that share a base hue and a
   * direction from landing on an identical accent, without ever leaving the
   * harmony the profile chose — the jitter is a twelfth of the smallest
   * interval between harmony positions.
   */
  const accentJitter = (seed % 25) - 12;
  const accentBase: OKLCH = {
    l: 0.66,
    c: Math.min(base.c * 1.25, ceiling * 1.35),
    h: (base.h + offsets.accent + accentJitter + 360) % 360,
  };

  const gamutWarnings: string[] = [];
  for (const [label, color] of [
    ["primary", { ...base, l: 0.6 }],
    ["secondary", secondaryBase],
    ["accent", accentBase],
  ] as const) {
    if (isOutOfGamut(color)) gamutWarnings.push(label);
  }

  const names = input.names ?? {};
  const swatches: ColorSwatch[] = [
    swatch(
      names.primary ?? "Primary",
      primaryHex,
      "primary",
      "Carries the brand. Roughly 60% of any coloured surface.",
    ),
    swatch(
      names.secondary ?? "Secondary",
      oklchToHex(secondaryBase),
      "secondary",
      "Supporting surfaces and section breaks — about 30%.",
    ),
    swatch(
      names.accent ?? "Accent",
      oklchToHex(accentBase),
      "accent",
      "Calls to action only. Never decorative, and never more than 10%.",
    ),
    ...buildNeutrals(base, direction, names.neutral),
  ];

  return {
    swatches,
    primaryScale,
    gamutWarnings,
    contrastReport: buildContrastReport(swatches),
  };
}

/**
 * Neutrals are tinted with the primary hue rather than being pure grey.
 *
 * Pure grey beside a saturated brand colour reads as a different, colder
 * material; carrying 3–8% of the primary's chroma through the neutrals is what
 * makes the whole system look like one palette.
 */
function buildNeutrals(
  base: OKLCH,
  direction: ArtDirection,
  nameHint?: string,
): ColorSwatch[] {
  const tint =
    direction.color.neutrals === "true"
      ? 0
      : direction.color.neutrals === "warm"
        ? 0.012
        : 0.008;

  const hue =
    direction.color.neutrals === "warm"
      ? 60
      : direction.color.neutrals === "cool"
        ? base.h
        : base.h;

  const steps: Array<[string, number, string]> = [
    ["Paper", 0.985, "Page backgrounds and generous white space."],
    ["Mist", 0.92, "Panels, dividers, and disabled states."],
    ["Slate", 0.62, "Secondary text, captions, and icons."],
    ["Graphite", 0.22, "Body copy and high-contrast surfaces."],
  ];

  return steps.map(([name, l, usage], i) =>
    swatch(
      i === 0 && nameHint ? nameHint : name,
      oklchToHex({ l, c: tint, h: hue }),
      "neutral",
      usage,
    ),
  );
}

/**
 * Contrast checks the guide publishes and the QC gate reads.
 *
 * Body text is held to WCAG AA (4.5:1); the accent is checked at 3:1, the bar
 * for large text and interactive boundaries.
 */
function buildContrastReport(
  swatches: ColorSwatch[],
): Array<{ pair: string; ratio: number; passes: boolean }> {
  const paper =
    swatches.find((s) => s.role === "neutral")?.hex ?? "#FFFFFF";
  const ink =
    [...swatches].reverse().find((s) => s.role === "neutral")?.hex ?? "#111111";

  const checks: Array<[string, string, string, number]> = [
    ["body text on paper", ink, paper, 4.5],
    ["primary on paper", swatches[0].hex, paper, 3],
    ["accent on paper", swatches[2].hex, paper, 3],
    ["paper on primary", paper, swatches[0].hex, 4.5],
  ];

  return checks.map(([pair, a, b, threshold]) => {
    const ratio = Math.round(contrastRatio(a, b) * 100) / 100;
    return { pair, ratio, passes: ratio >= threshold };
  });
}

/* -------------------------------------------------------------------------- */
/*  Sector seed hues                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Starting hues per sector, following the spec's chromatic guidance.
 *
 * These are only a *seed*: the art direction still decides harmony, saturation
 * and neutral temperature, so the same sector produces visibly different
 * palettes under different directions. A stated brand colour overrides them
 * entirely.
 */
const SECTOR_HUES: Record<string, number[]> = {
  fintech: [255, 165, 230],
  finance: [255, 240, 150],
  tech: [265, 240, 195],
  health: [190, 165, 220],
  food: [35, 20, 120],
  luxury: [40, 320, 20],
  beauty: [350, 30, 320],
  education: [250, 70, 20],
  legal: [255, 15, 40],
  realestate: [230, 60, 30],
  eco: [130, 90, 55],
  agro: [110, 70, 40],
  sport: [15, 60, 265],
  creative: [290, 340, 25],
  industry: [220, 30, 200],
  hospitality: [25, 340, 200],
  default: [240, 200, 30],
};

/** Hues the sector should avoid, per the spec's "à éviter" column. */
const SECTOR_AVOID: Record<string, [number, number][]> = {
  food: [[200, 260]], // blue suppresses appetite
  health: [[0, 15]], // clinical red reads as alarm
  legal: [[300, 350]], // pink undercuts authority
};

function isAvoided(hue: number, sector: string): boolean {
  return (SECTOR_AVOID[sector] ?? []).some(
    ([from, to]) => hue >= from && hue <= to,
  );
}

/** Picks the seed hue for a brand, honouring any colour the user asked for. */
export function seedHue(
  sector: string,
  seed: number,
  desired?: string,
): string {
  if (desired) return normalizeHex(desired);

  const hues = SECTOR_HUES[sector] ?? SECTOR_HUES.default;
  const candidates = hues.filter((h) => !isAvoided(h, sector));
  const pool = candidates.length > 0 ? candidates : hues;
  const hue = pool[seed % pool.length];

  return oklchToHex({ l: 0.55, c: 0.14, h: hue });
}
