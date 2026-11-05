import { z } from "zod";
import { complete, extractJson, hasApiKey } from "./client";
import { darken, isDark, lighten, readableOn } from "../color";
import { MARK_TOKEN, ACCENT_TOKEN, paintMark } from "./mark-tokens";
import { advanceWidth } from "./text-metrics";
import type { ArtDirection } from "./art-direction";
import type {
  BrandBrief,
  ColorSwatch,
  LogoUsage,
  LogoVariant,
  TypeStyle,
} from "../types";
import { primaryColor } from "../types";

/**
 * Step 2 of the pipeline: brand brief + palette → a vector logo system.
 *
 * The model designs the *mark* only, using two colour placeholders. Every
 * lockup and variant (full colour, monochrome, inverted, icon-only,
 * horizontal) is composed locally from that mark, which is what makes the
 * variants genuinely consistent instead of five unrelated drawings.
 */

export { MARK_TOKEN, ACCENT_TOKEN, paintMark } from "./mark-tokens";

const MarkResponseSchema = z.object({
  concept: z.string(),
  /** SVG children only — no <svg> wrapper — drawn inside a 0 0 100 100 box. */
  markup: z.string(),
  /** Preferred lockup when the wordmark sits next to the mark. */
  lockup: z.enum(["horizontal", "stacked"]).default("horizontal"),
});

const SYSTEM = `You are a logo designer who works in vectors. You produce marks that hold up at 16px and at billboard scale.

Output JSON only. No prose, no code fences.

The "markup" field contains SVG child elements ONLY (no <svg> wrapper, no <style>, no <script>, no <image>, no <foreignObject>, no external references, no filters, no text elements).

Hard constraints:
- Draw inside the coordinate box 0 0 100 100. Keep the mark visually centred with roughly 6 units of margin.
- Use ONLY these two colour values: "{{MARK}}" and "{{ACCENT}}". Never a literal hex, never "currentColor", never a gradient.
- Use at most 6 shape elements (path, circle, rect, polygon, ellipse, line).
- Strokes must use stroke-linecap="round" and stroke-linejoin="round", and stroke-width between 6 and 12.
- The mark must read as a single silhouette in one colour — test it mentally in pure black.
- No literal depictions of the brand name's letters unless the concept is a monogram.
- Avoid the obvious sector cliché (no coffee cups for cafés, no lightbulbs for ideas, no leaves for eco).`;

function buildPrompt(
  brief: BrandBrief,
  sector: string,
  direction?: ArtDirection,
): string {
  const artDirection = direction
    ? `
Art direction: ${direction.name}. ${direction.description}
Shape language: ${direction.shapes}.
Corner radius: ${direction.radius === 0 ? "sharp corners, no rounding" : direction.radius >= 999 ? "fully rounded, pill forms" : `${direction.radius}px on a 100-unit box`}.
Stroke weight: ${direction.stroke} units.
Iconography: ${direction.iconography}.
The mark must obey this shape language — it is what keeps it distinct from other brands in the same sector.
`
    : "";

  return `Design the icon mark for this brand.

Brand name: ${brief.name}
Sector: ${brief.industry} (detected: ${sector})
What it stands for: ${brief.keywords}
${artDirection}
Return exactly:
{
  "concept": "one sentence on what the mark represents and why",
  "markup": "<path d=\\"...\\" fill=\\"{{MARK}}\\"/>",
  "lockup": "horizontal" | "stacked"
}`;
}

/**
 * Strips anything that could execute, load remotely, or animate into a
 * dangerous state.
 *
 * This runs on two untrusted inputs — model output and user-uploaded SVGs —
 * and its result is the only markup the app injects into the DOM (see
 * `components/SvgFrame.tsx`). Everything here is deny-listed by element or
 * attribute shape rather than parsed, so the rules are deliberately blunt:
 * a mark that loses a legitimate element is a cosmetic bug, a mark that keeps
 * an illegitimate one is a cross-site scripting hole.
 */
const FORBIDDEN_ELEMENTS =
  "script|foreignObject|image|use|style|iframe|animate|animateTransform|animateMotion|set|handler|audio|video|embed|object|link|meta";

/**
 * Elements whose *contents* are as dangerous as the tag: dropping only the
 * tags would leave the script body behind as a text node.
 */
const CONTENT_BEARING = "script|style|foreignObject|iframe|object";

export function sanitizeMarkup(markup: string): string {
  return (
    markup
      // Content-bearing elements go wholesale, children included.
      .replace(
        new RegExp(
          `<\\s*(${CONTENT_BEARING})\\b[^>]*>[\\s\\S]*?<\\/\\s*\\1\\s*>`,
          "gi",
        ),
        "",
      )
      // Then any remaining forbidden tags, including unmatched and self-closing.
      .replace(new RegExp(`<\\s*(?:${FORBIDDEN_ELEMENTS})\\b[^>]*>`, "gi"), "")
      .replace(new RegExp(`<\\/\\s*(?:${FORBIDDEN_ELEMENTS})\\s*>`, "gi"), "")
      // Event handlers — quoted and unquoted alike. The unquoted form is what
      // a naive quoted-only pattern misses: `onload=alert(1)`.
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
      // Any link target other than a same-document fragment.
      .replace(/\s(?:xlink:)?href\s*=\s*"(?!#)[^"]*"/gi, "")
      .replace(/\s(?:xlink:)?href\s*=\s*'(?!#)[^']*'/gi, "")
      .replace(/\s(?:xlink:)?href\s*=\s*(?!["'#])[^\s>]+/gi, "")
      // javascript:/data: payloads smuggled through any other attribute.
      .replace(/\s\w[\w:-]*\s*=\s*"[^"]*(?:javascript|data):[^"]*"/gi, "")
      .replace(/\s\w[\w:-]*\s*=\s*'[^']*(?:javascript|data):[^']*'/gi, "")
      .trim()
  );
}

export interface MarkSpec {
  concept: string;
  markup: string;
  lockup: "horizontal" | "stacked";
}

export async function generateMark(
  brief: BrandBrief,
  sector: string,
  direction?: ArtDirection,
): Promise<MarkSpec> {
  if (!hasApiKey()) return fallbackMark(brief);

  const raw = await complete({
    system: SYSTEM,
    prompt: buildPrompt(brief, sector, direction),
    effort: "high",
    maxTokens: 24000,
  });

  const parsed = MarkResponseSchema.parse(extractJson(raw));
  const markup = sanitizeMarkup(parsed.markup);

  // A mark that sanitizes down to nothing is worse than no mark at all.
  if (!/<(path|circle|rect|polygon|ellipse|line|g)\b/i.test(markup)) {
    return fallbackMark(brief);
  }

  return { concept: parsed.concept, markup, lockup: parsed.lockup };
}

/* -------------------------------------------------------------------------- */
/*  Lockup composition                                                        */
/* -------------------------------------------------------------------------- */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Advance width of the wordmark. Shared with the mockup renderer so a lockup
 * measures the same wherever it is composed — see `./text-metrics`.
 */
function estimateTextWidth(
  text: string,
  fontSize: number,
  letterSpacing = 0,
  fontStack = "",
): number {
  return advanceWidth(text, fontSize, letterSpacing, fontStack);
}

interface LockupOptions {
  markup: string;
  name: string;
  markColor: string;
  accentColor: string;
  textColor: string;
  fontStack: string;
  fontWeight: number;
  letterSpacingEm: number;
  layout: "horizontal" | "stacked" | "icon";
}

function composeLockup(opts: LockupOptions): string {
  const painted = paintMark(opts.markup, opts.markColor, opts.accentColor);
  const name = escapeXml(opts.name);
  const family = escapeXml(opts.fontStack);

  if (opts.layout === "icon") {
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="${name} icon">`,
      painted,
      `</svg>`,
    ].join("");
  }

  if (opts.layout === "stacked") {
    const fontSize = 22;
    const textWidth = estimateTextWidth(
      opts.name,
      fontSize,
      opts.letterSpacingEm * fontSize,
      opts.fontStack,
    );
    const width = Math.max(160, textWidth + 32);
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 168" width="${width}" height="168" role="img" aria-label="${name}">`,
      `<g transform="translate(${(width - 84) / 2}, 8)"><g transform="scale(0.84)">${painted}</g></g>`,
      `<text x="${width / 2}" y="146" text-anchor="middle" font-family="${family}" font-size="${fontSize}" font-weight="${opts.fontWeight}" letter-spacing="${(opts.letterSpacingEm * fontSize).toFixed(2)}" fill="${opts.textColor}">${name}</text>`,
      `</svg>`,
    ].join("");
  }

  const fontSize = 30;
  const markSize = 56;
  const gap = 18;
  const letterSpacing = opts.letterSpacingEm * fontSize;

  /*
   * Unlike the mockups, this is a root <svg> that gets exported as a file, so
   * its viewBox has to actually contain the artwork — it cannot lean on a <g>
   * to escape clipping. The clear space is therefore sized to absorb the width
   * estimate's worst case: measured against the real faces, the per-character
   * table falls at most ~9.5% short on a wide-lettered display font, so 6% of
   * breathing room on each side keeps even that inside the canvas.
   *
   * Splitting it evenly is what matters. For a font the table measures well,
   * the lockup lands exactly on the canvas centre; for the worst case it drifts
   * right by half the shortfall instead of losing its last letter.
   */
  const textWidth = estimateTextWidth(
    opts.name,
    fontSize,
    letterSpacing,
    opts.fontStack,
  );
  const contentWidth = markSize + gap + textWidth;
  const padding = Math.max(6, contentWidth * 0.06);
  const width = Math.round(contentWidth + padding * 2);
  const height = 80;

  const left = (width - contentWidth) / 2;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${name}">`,
    `<g transform="translate(${left.toFixed(2)}, ${(height - markSize) / 2}) scale(${markSize / 100})">${painted}</g>`,
    `<text x="${(left + markSize + gap).toFixed(2)}" y="${height / 2}" dominant-baseline="central" font-family="${family}" font-size="${fontSize}" font-weight="${opts.fontWeight}" letter-spacing="${letterSpacing.toFixed(2)}" fill="${opts.textColor}">${name}</text>`,
    `</svg>`,
  ].join("");
}

export function buildLogoVariants(
  brief: BrandBrief,
  mark: MarkSpec,
  palette: ColorSwatch[],
  typography: TypeStyle[],
): LogoVariant[] {
  const primary = primaryColor(palette);
  const accent =
    palette.find((s) => s.role === "accent") ??
    palette.find((s) => s.role === "secondary") ??
    primary;
  const ink =
    palette.find((s) => s.role === "neutral" && isDark(s.hex))?.hex ?? "#141414";
  const paper =
    palette.find((s) => s.role === "neutral" && !isDark(s.hex))?.hex ??
    "#FFFFFF";

  const display =
    typography.find((t) => t.role === "display") ?? typography[0];
  const fontWeight = Math.max(...display.weights);

  const base = {
    markup: mark.markup,
    name: brief.name,
    fontStack: display.stack,
    fontWeight,
    letterSpacingEm: display.letterSpacingEm,
  };

  const layout = mark.lockup;

  return [
    {
      id: "primary",
      label: "Logo principal",
      background: "light",
      usage:
        "La version par défaut, partout où la marque apparaît en couleur sur fond clair.",
      svg: composeLockup({
        ...base,
        layout,
        markColor: primary.hex,
        accentColor: accent.hex,
        textColor: ink,
      }),
    },
    {
      id: "horizontal",
      label: "Logo horizontal",
      background: "light",
      usage:
        "Pour les hauteurs réduites : en-têtes de site, signatures d’e-mail, pieds de document.",
      svg: composeLockup({
        ...base,
        layout: "horizontal",
        markColor: primary.hex,
        accentColor: accent.hex,
        textColor: ink,
      }),
    },
    {
      id: "monochrome",
      label: "Monochrome",
      background: "neutral",
      usage:
        "Reproduction en une couleur : gravure, broderie, tampons et toute impression une teinte.",
      svg: composeLockup({
        ...base,
        layout,
        markColor: ink,
        accentColor: ink,
        textColor: ink,
      }),
    },
    {
      id: "inverted",
      label: "Inversé",
      background: "dark",
      usage:
        "Pour les fonds sombres et les photos. Ne jamais poser le logo principal sur un fond sombre.",
      svg: composeLockup({
        ...base,
        layout,
        markColor: paper,
        accentColor: lighten(accent.hex, 0.35),
        textColor: paper,
      }),
    },
    {
      id: "icon",
      label: "Icône seule",
      background: "light",
      usage:
        "Icônes d’application, favicons, photos de profil et tout emplacement de moins de 40 px.",
      svg: composeLockup({
        ...base,
        layout: "icon",
        markColor: primary.hex,
        accentColor: accent.hex,
        textColor: ink,
      }),
    },
  ];
}

export function buildLogoUsage(brief: BrandBrief): LogoUsage {
  return {
    clearSpaceRatio: 0.5,
    minWidthPx: 96,
    minWidthMm: 24,
    rules: [
      {
        kind: "do",
        title: "Respecter la zone de protection",
        detail:
          "Laisser au moins la moitié de la hauteur du symbole libre de chaque côté. Ni texte, ni image, ni bord de page dans cette zone.",
      },
      {
        kind: "do",
        title: "Respecter la taille minimale",
        detail:
          "96 px à l’écran, 24 mm en impression pour le logo complet. En dessous, utiliser l’icône seule.",
      },
      {
        kind: "do",
        title: "Choisir la version selon le fond",
        detail:
          "Couleur sur fond clair, inversé sur fond sombre, monochrome quand une seule encre est possible.",
      },
      {
        kind: "dont",
        title: "Ne pas changer les couleurs",
        detail: `Seules les versions validées sont autorisées. Le logo de ${brief.name} n’apparaît jamais dans une couleur hors palette.`,
      },
      {
        kind: "dont",
        title: "Ne pas déformer ni pivoter",
        detail:
          "Redimensionner uniquement en proportion. Pas d’étirement, d’inclinaison, de rotation ni d’ombre portée.",
      },
      {
        kind: "dont",
        title: "Éviter les photos chargées",
        detail:
          "Si le fond est chargé derrière le logo, ajouter un aplat ou choisir une zone unie de l’image.",
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/*  Deterministic fallback mark                                               */
/* -------------------------------------------------------------------------- */

/**
 * A geometric monogram built from the brand's initials. Used when no model key
 * is configured, and as a safety net if the model returns an unusable mark.
 */
export function fallbackMark(brief: BrandBrief): MarkSpec {
  const initials = brief.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const seed = [...brief.name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const variant = seed % 4;

  const shells = [
    // Rounded square with a corner notch
    `<rect x="10" y="10" width="80" height="80" rx="22" fill="${MARK_TOKEN}"/><path d="M62 10 H90 V38 Z" fill="${ACCENT_TOKEN}"/>`,
    // Circle with an offset arc
    `<circle cx="50" cy="50" r="40" fill="${MARK_TOKEN}"/><path d="M50 10 A40 40 0 0 1 90 50" fill="none" stroke="${ACCENT_TOKEN}" stroke-width="10" stroke-linecap="round"/>`,
    // Chamfered hexagon
    `<polygon points="50,8 88,29 88,71 50,92 12,71 12,29" fill="${MARK_TOKEN}"/><polygon points="50,8 88,29 50,50" fill="${ACCENT_TOKEN}"/>`,
    // Split shield
    `<path d="M50 8 L88 22 V56 C88 76 70 88 50 93 C30 88 12 76 12 56 V22 Z" fill="${MARK_TOKEN}"/><path d="M50 8 L88 22 V56 C88 68 80 77 70 83 L50 60 Z" fill="${ACCENT_TOKEN}"/>`,
  ];

  const fill = readableOn(variant === 1 ? "#333333" : "#333333");

  return {
    concept: `Un monogramme géométrique construit sur les initiales ${initials}, lisible même en favicon.`,
    markup: `${shells[variant]}<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="system-ui, sans-serif" font-size="${initials.length > 1 ? 34 : 44}" font-weight="700" letter-spacing="-1" fill="${fill}">${escapeXml(initials || "B")}</text>`,
    lockup: "horizontal",
  };
}


export function markOnDark(markup: string, paper: string, accent: string) {
  return paintMark(markup, paper, lighten(accent, 0.3));
}

export function markMono(markup: string, ink: string) {
  return paintMark(markup, ink, darken(ink, 0.1));
}
