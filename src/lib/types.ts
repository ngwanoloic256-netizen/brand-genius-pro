import type { ArtDirection } from "./ai/art-direction";
import type { QualityReport } from "./ai/quality";

/**
 * Domain model for BRAND GENIUS.
 *
 * A `BrandGuide` is the full output of the generation pipeline: everything the
 * charte graphique page renders and everything the PDF export writes.
 */

export type ProjectStatus = "draft" | "guide_generated" | "complete";

export type CreationMode = "generate_logo" | "import_logo" | "guide_only";

export interface BrandBrief {
  name: string;
  industry: string;
  /** Free-form keywords describing values, personality, and audience. */
  keywords: string;
  audience?: string;
  /** Optional imported logo, stored as an SVG string or a data URI. */
  importedLogo?: string;
}

export type ColorRole = "primary" | "secondary" | "accent" | "neutral";

export interface ColorSwatch {
  name: string;
  hex: string;
  rgb: [number, number, number];
  cmyk: [number, number, number, number];
  role: ColorRole;
  /** When to reach for this colour, in one sentence. */
  usage: string;
  /** Best foreground colour on top of this swatch. */
  onColor: string;
}

export type TypeRole = "display" | "heading" | "body" | "data";

export interface TypeStyle {
  role: TypeRole;
  family: string;
  /** CSS font stack including fallbacks. */
  stack: string;
  googleFontsHref: string | null;
  weights: number[];
  sizePx: number;
  lineHeight: number;
  letterSpacingEm: number;
  usage: string;
}

export type LogoVariantId =
  | "primary"
  | "monochrome"
  | "inverted"
  | "icon"
  | "horizontal";

export interface LogoVariant {
  id: LogoVariantId;
  label: string;
  /** Complete, standalone SVG markup with a transparent background. */
  svg: string;
  /** Surface the variant is designed to sit on. */
  background: "light" | "dark" | "neutral";
  usage: string;
}

export type MockupCategory =
  | "print"
  | "digital"
  | "packaging"
  | "environmental"
  | "apparel";

/**
 * Composition families. The variety rule forbids two consecutive mockups from
 * sharing a family, and forbids reusing a scene template within one project.
 */
export type MockupFamily =
  | "flat-lay"
  | "lifestyle"
  | "product-closeup"
  | "digital-screen"
  | "signage";

export interface Mockup {
  id: string;
  title: string;
  category: MockupCategory;
  family: MockupFamily;
  /** Scene template that produced it — used to enforce non-repetition. */
  scene: string;
  svg: string;
}

export interface BrandVoice {
  personality: string[];
  toneDo: string[];
  toneDont: string[];
  tagline: string;
  positioning: string;
}

export interface UsageRule {
  kind: "do" | "dont";
  title: string;
  detail: string;
}

export interface LogoUsage {
  /** Clear space expressed in multiples of the logo's cap height. */
  clearSpaceRatio: number;
  minWidthPx: number;
  minWidthMm: number;
  rules: UsageRule[];
}

export interface BrandStrategy {
  /** Normalised sector slug the pipeline detected from the brief. */
  sector: string;
  rationale: string;
  voice: BrandVoice;
  /**
   * The art direction the whole system was derived from.
   *
   * Stored as a full snapshot rather than an id: a guide has to keep rendering
   * exactly as generated even after the profile library is edited, and a guide
   * whose look silently drifts when we ship a tweak is not a guide.
   */
  artDirection: ArtDirection;
  /** Why this direction, in one sentence. */
  artDirectionRationale: string;
  /** Deterministic seed — the same brief always regenerates identically. */
  seed: number;
}

/** Contrast checks published in the guide and enforced by the QC gate. */
export interface ContrastCheck {
  pair: string;
  ratio: number;
  passes: boolean;
}

/**
 * The icon mark, stored separately from the composed variants.
 *
 * Colour placeholders are still in place here, which is what lets a single
 * section be regenerated — recolour the mark for a new palette, or re-render
 * the mockup scenes — without redrawing the logo.
 */
export interface BrandMark {
  concept: string;
  markup: string;
  lockup: "horizontal" | "stacked";
}

export interface BrandGuide {
  brief: BrandBrief;
  strategy: BrandStrategy;
  palette: ColorSwatch[];
  /** Full 50-950 tonal scale for the primary, for hand-off to developers. */
  primaryScale: Record<number, string>;
  contrastReport: ContrastCheck[];
  /** What the quality gates found, and what they repaired. */
  quality: QualityReport;
  typography: TypeStyle[];
  mark: BrandMark;
  logo: LogoVariant[];
  logoUsage: LogoUsage;
  mockups: Mockup[];
  generatedAt: string;
}

export interface BrandDirection {
  id: string;
  name: string;
  description: string;
  palette: ColorSwatch[];
  typography: TypeStyle[];
  logo: LogoVariant;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  industry: string;
  keywords: string;
  status: ProjectStatus;
  mode: CreationMode;
  guide: BrandGuide | null;
  createdAt: string;
  updatedAt: string;
}

/** Convenience accessors used across the UI. */
export function swatchesByRole(
  palette: ColorSwatch[],
  role: ColorRole,
): ColorSwatch[] {
  return palette.filter((s) => s.role === role);
}

export function primaryColor(palette: ColorSwatch[]): ColorSwatch {
  return palette.find((s) => s.role === "primary") ?? palette[0];
}

export function typeStyle(
  typography: TypeStyle[],
  role: TypeRole,
): TypeStyle | undefined {
  return typography.find((t) => t.role === role);
}
