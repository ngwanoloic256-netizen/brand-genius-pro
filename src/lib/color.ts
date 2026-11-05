/**
 * Colour maths for palette construction and contrast checks.
 *
 * The AI supplies hex values and semantic names; everything derived from them
 * (RGB, CMYK, tints, contrast-safe foregrounds) is computed here so print codes
 * are always internally consistent with the hex the user copies.
 */

export type RGB = [number, number, number];
export type CMYK = [number, number, number, number];

export function normalizeHex(input: string): string {
  let hex = input.trim().replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "#000000";
  return `#${hex.toUpperCase()}`;
}

export function hexToRgb(hex: string): RGB {
  const h = normalizeHex(hex).slice(1);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHex([r, g, b]: RGB): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b]
    .map((v) => clamp(v).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

/** Naive but standard conversion — good enough for a print-ready reference. */
export function rgbToCmyk([r, g, b]: RGB): CMYK {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const k = 1 - Math.max(rf, gf, bf);
  if (k === 1) return [0, 0, 0, 100];
  const c = (1 - rf - k) / (1 - k);
  const m = (1 - gf - k) / (1 - k);
  const y = (1 - bf - k) / (1 - k);
  return [
    Math.round(c * 100),
    Math.round(m * 100),
    Math.round(y * 100),
    Math.round(k * 100),
  ];
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** Picks black or white — whichever reads better on the given background. */
export function readableOn(hex: string): string {
  return contrastRatio(hex, "#FFFFFF") >= contrastRatio(hex, "#111111")
    ? "#FFFFFF"
    : "#111111";
}

export function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex([
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t,
  ]);
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, "#FFFFFF", amount);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, "#000000", amount);
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.4;
}

/** Formats a swatch's print codes the way the charte page and PDF show them. */
export function formatCmyk(cmyk: CMYK): string {
  return `C${cmyk[0]} M${cmyk[1]} Y${cmyk[2]} K${cmyk[3]}`;
}

export function formatRgb(rgb: RGB): string {
  return `R${rgb[0]} G${rgb[1]} B${rgb[2]}`;
}

/* -------------------------------------------------------------------------- */
/*  OKLCH                                                                     */
/*                                                                            */
/*  Palettes are derived in OKLCH rather than HSL because HSL's lightness is  */
/*  not perceptual: stepping L evenly there makes yellows wash out and blues  */
/*  go muddy at the same nominal value. OKLab was built so that equal numeric */
/*  steps look like equal steps, which is exactly what a tonal scale needs.   */
/* -------------------------------------------------------------------------- */

export interface OKLCH {
  /** Perceptual lightness, 0..1 */
  l: number;
  /** Chroma, roughly 0..0.4 for displayable colours */
  c: number;
  /** Hue angle in degrees, 0..360 */
  h: number;
}

function srgbToLinear(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v: number): number {
  const s =
    v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, s)) * 255);
}

export function hexToOklch(hex: string): OKLCH {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = srgbToLinear(r8);
  const g = srgbToLinear(g8);
  const b = srgbToLinear(b8);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.sqrt(A * A + B * B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;

  return { l: L, c, h };
}

/** Raw conversion — may fall outside the sRGB gamut. */
function oklchToRgbRaw({ l: L, c, h }: OKLCH): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const A = c * Math.cos(hRad);
  const B = c * Math.sin(hRad);

  const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = L - 0.0894841775 * A - 1.291485548 * B;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function inGamut(rgb: [number, number, number]): boolean {
  return rgb.every((v) => v >= -0.001 && v <= 1.001);
}

/**
 * Converts to hex, reducing chroma until the colour is displayable.
 *
 * Clipping the channels instead would shift the hue — a bright green clipped
 * component-wise drifts yellow. Walking the chroma down keeps the hue and
 * lightness the palette was designed around and gives up only saturation,
 * which is the one attribute a screen genuinely cannot deliver.
 */
export function oklchToHex(color: OKLCH): string {
  let { c } = color;
  let rgb = oklchToRgbRaw({ ...color, c });

  for (let i = 0; i < 24 && !inGamut(rgb); i++) {
    c *= 0.92;
    rgb = oklchToRgbRaw({ ...color, c });
  }

  return rgbToHex([
    linearToSrgb(rgb[0]),
    linearToSrgb(rgb[1]),
    linearToSrgb(rgb[2]),
  ]);
}

/** True when the colour needs chroma reduction to be displayable. */
export function isOutOfGamut(color: OKLCH): boolean {
  return !inGamut(oklchToRgbRaw(color));
}

export function rotateHueOklch(hex: string, degrees: number): string {
  const color = hexToOklch(hex);
  return oklchToHex({ ...color, h: (color.h + degrees + 360) % 360 });
}
