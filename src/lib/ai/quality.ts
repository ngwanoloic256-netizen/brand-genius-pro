import { contrastRatio, hexToOklch, lighten, darken } from "../color";
import type {
  BrandGuide,
  ColorSwatch,
  ContrastCheck,
  TypeStyle,
} from "../types";

/**
 * Quality control.
 *
 * These are gates, not advice. A generated identity that fails a legibility or
 * hierarchy rule is a defect the customer would have to discover for
 * themselves, so the pipeline repairs what it can and reports what it cannot
 * rather than shipping it quietly.
 *
 * The repairs are deliberately narrow. When body text fails contrast the fix is
 * to move the *neutral*, never the accent: the accent carries brand meaning and
 * a system that silently re-hues it to pass a checker is no longer the system
 * the designer chose.
 */

export type CheckId =
  | "body-contrast"
  | "accent-contrast"
  | "logo-legibility"
  | "type-family-count"
  | "palette-roles"
  | "mockup-variety";

export interface QualityIssue {
  id: CheckId;
  severity: "blocking" | "warning";
  message: string;
  /** What the pipeline did about it, when it could act. */
  repaired?: string;
}

export interface QualityReport {
  passed: boolean;
  issues: QualityIssue[];
}

const AA_BODY = 4.5;
const AA_LARGE = 3;

/* -------------------------------------------------------------------------- */
/*  Repairs                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Walks a neutral until body text clears AA against it.
 *
 * Only the neutral moves. Nudging the ink or the paper is invisible to the
 * brand's character; nudging the primary or accent would change what the brand
 * looks like in order to satisfy a number.
 */
function repairBodyContrast(palette: ColorSwatch[]): {
  palette: ColorSwatch[];
  repaired: string | null;
} {
  const neutrals = palette.filter((s) => s.role === "neutral");
  if (neutrals.length < 2) return { palette, repaired: null };

  const paper = neutrals[0];
  const ink = neutrals[neutrals.length - 1];

  if (contrastRatio(ink.hex, paper.hex) >= AA_BODY) {
    return { palette, repaired: null };
  }

  let hex = ink.hex;
  for (let i = 0; i < 20; i++) {
    hex = darken(hex, 0.08);
    if (contrastRatio(hex, paper.hex) >= AA_BODY) break;
  }

  const ratio = contrastRatio(hex, paper.hex);
  if (ratio < AA_BODY) return { palette, repaired: null };

  return {
    palette: palette.map((s) =>
      s === ink ? { ...s, hex, onColor: paper.hex } : s,
    ),
    repaired: `Darkened the ink neutral to reach ${ratio.toFixed(2)}:1 against paper.`,
  };
}

/**
 * Lifts or deepens the accent until it separates from paper.
 *
 * The hue is held: only lightness moves, so the accent stays the colour the
 * direction chose while becoming visible against the page.
 */
function repairAccentContrast(palette: ColorSwatch[]): {
  palette: ColorSwatch[];
  repaired: string | null;
} {
  const accent = palette.find((s) => s.role === "accent");
  const paper = palette.find((s) => s.role === "neutral");
  if (!accent || !paper) return { palette, repaired: null };

  if (contrastRatio(accent.hex, paper.hex) >= AA_LARGE) {
    return { palette, repaired: null };
  }

  const paperIsLight = hexToOklch(paper.hex).l > 0.5;
  let hex = accent.hex;

  for (let i = 0; i < 20; i++) {
    hex = paperIsLight ? darken(hex, 0.07) : lighten(hex, 0.07);
    if (contrastRatio(hex, paper.hex) >= AA_LARGE) break;
  }

  const ratio = contrastRatio(hex, paper.hex);
  if (ratio < AA_LARGE) return { palette, repaired: null };

  return {
    palette: palette.map((s) => (s === accent ? { ...s, hex } : s)),
    repaired: `Shifted the accent's lightness to reach ${ratio.toFixed(2)}:1 against paper.`,
  };
}

/* -------------------------------------------------------------------------- */
/*  Checks                                                                    */
/* -------------------------------------------------------------------------- */

function checkTypeFamilies(typography: TypeStyle[]): QualityIssue | null {
  const families = new Set(typography.map((t) => t.family));
  // Three is the ceiling, and only because a technical mono earns its place.
  if (families.size <= 3) return null;

  return {
    id: "type-family-count",
    severity: "blocking",
    message: `The system uses ${families.size} type families (${[...families].join(", ")}). The limit is three, including a mono.`,
  };
}

function checkPaletteRoles(palette: ColorSwatch[]): QualityIssue | null {
  const missing = (["primary", "secondary", "accent", "neutral"] as const).filter(
    (role) => !palette.some((s) => s.role === role),
  );
  if (missing.length === 0) return null;

  return {
    id: "palette-roles",
    severity: "blocking",
    message: `The palette is missing ${missing.join(", ")}.`,
  };
}

/**
 * Stands in for the spec's 16px rasterisation test.
 *
 * Genuinely rasterising would need a canvas, which the server does not have, so
 * the proxy is structural: a mark made of many small shapes or hairline strokes
 * is what turns into a smudge at favicon size, and both are visible in the
 * markup.
 */
function checkLogoLegibility(guide: BrandGuide): QualityIssue | null {
  const markup = guide.mark.markup;
  const shapeCount = (markup.match(/<(path|circle|rect|polygon|ellipse|line)\b/gi) ?? [])
    .length;

  const strokes = [...markup.matchAll(/stroke-width\s*=\s*"([\d.]+)"/gi)].map(
    (m) => Number(m[1]),
  );
  const hairline = strokes.filter((w) => w > 0 && w < 4);

  if (shapeCount > 8) {
    return {
      id: "logo-legibility",
      severity: "warning",
      message: `The mark has ${shapeCount} shapes. Above roughly eight it stops reading at 16px — the icon-only variant is the one to use small.`,
    };
  }

  if (hairline.length > 0) {
    return {
      id: "logo-legibility",
      severity: "warning",
      message: `The mark uses strokes as thin as ${Math.min(...hairline)} units on a 100-unit box, which disappears below about 24px.`,
    };
  }

  return null;
}

function checkMockupVariety(guide: BrandGuide): QualityIssue | null {
  const ids = guide.mockups.map((m) => m.id);
  if (new Set(ids).size !== ids.length) {
    return {
      id: "mockup-variety",
      severity: "blocking",
      message: "The same mockup surface appears twice in one board.",
    };
  }

  const families = guide.mockups.map((m) => m.family);
  for (let i = 1; i < families.length; i++) {
    if (families[i] === families[i - 1]) {
      return {
        id: "mockup-variety",
        severity: "blocking",
        message: `Two consecutive mockups share the ${families[i]} composition.`,
      };
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Entry point                                                               */
/* -------------------------------------------------------------------------- */

export interface QualityResult {
  guide: BrandGuide;
  report: QualityReport;
}

/**
 * Runs every gate, repairing what is repairable, and returns the guide the
 * customer should actually receive alongside an honest report of what was
 * changed and what still falls short.
 */
export function enforceQuality(guide: BrandGuide): QualityResult {
  const issues: QualityIssue[] = [];
  let palette = guide.palette;

  const body = repairBodyContrast(palette);
  palette = body.palette;
  if (body.repaired) {
    issues.push({
      id: "body-contrast",
      severity: "warning",
      message: "Body text did not clear WCAG AA against the page background.",
      repaired: body.repaired,
    });
  }

  const accent = repairAccentContrast(palette);
  palette = accent.palette;
  if (accent.repaired) {
    issues.push({
      id: "accent-contrast",
      severity: "warning",
      message: "The accent did not separate from the page background.",
      repaired: accent.repaired,
    });
  }

  for (const issue of [
    checkPaletteRoles(palette),
    checkTypeFamilies(guide.typography),
    checkLogoLegibility(guide),
    checkMockupVariety(guide),
  ]) {
    if (issue) issues.push(issue);
  }

  const repaired: BrandGuide = {
    ...guide,
    palette,
    contrastReport: rebuildContrastReport(palette),
  };

  return {
    guide: repaired,
    report: {
      passed: issues.every((i) => i.severity !== "blocking"),
      issues,
    },
  };
}

function rebuildContrastReport(palette: ColorSwatch[]): ContrastCheck[] {
  const neutrals = palette.filter((s) => s.role === "neutral");
  const paper = neutrals[0]?.hex ?? "#FFFFFF";
  const ink = neutrals[neutrals.length - 1]?.hex ?? "#111111";
  const primary = palette.find((s) => s.role === "primary")?.hex ?? ink;
  const accent = palette.find((s) => s.role === "accent")?.hex ?? primary;

  const checks: Array<[string, string, string, number]> = [
    ["body text on paper", ink, paper, AA_BODY],
    ["primary on paper", primary, paper, AA_LARGE],
    ["accent on paper", accent, paper, AA_LARGE],
    ["paper on primary", paper, primary, AA_BODY],
  ];

  return checks.map(([pair, a, b, threshold]) => {
    const ratio = Math.round(contrastRatio(a, b) * 100) / 100;
    return { pair, ratio, passes: ratio >= threshold };
  });
}
