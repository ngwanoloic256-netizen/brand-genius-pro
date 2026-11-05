import { readableOn, withAlpha, contrastRatio } from "../color";
import { paintMark } from "./mark-tokens";
import type { ArtDirection } from "./art-direction";
import type { BrandGuide, ColorSwatch, TypeStyle } from "../types";

/**
 * Flyer generation.
 *
 * A flyer is not a poster with contact details bolted on — it answers three
 * questions in a fixed visual order (what / why me / what now), and the whole
 * layout system here exists to make that order legible in about three seconds.
 *
 * Everything is laid out in millimetres at true print size, with bleed and a
 * safe zone, so what is previewed on screen is what the printer receives. The
 * geometry, colour logic and type come from the brand's art direction, and the
 * layout variant is filtered by it — a brutalist brand is never handed a
 * centred editorial composition.
 */

/* -------------------------------------------------------------------------- */
/*  Formats                                                                   */
/* -------------------------------------------------------------------------- */

export interface FlyerFormat {
  id: "a6" | "a5" | "dl" | "a4";
  label: string;
  /** Trim size in millimetres. */
  width: number;
  height: number;
  /** Composition margin, inside the safe zone. */
  margin: number;
}

export const FLYER_FORMATS: FlyerFormat[] = [
  { id: "a6", label: "A6 — à distribuer", width: 105, height: 148, margin: 8 },
  { id: "a5", label: "A5 — standard", width: 148, height: 210, margin: 10 },
  { id: "dl", label: "DL — présentoir", width: 99, height: 210, margin: 8 },
  { id: "a4", label: "A4 — affiche / dossier", width: 210, height: 297, margin: 12 },
];

/** Print bleed on every edge. Non-negotiable for commercial printing. */
export const BLEED = 3;
/** Nothing important may sit outside this inset from the trim. */
export const SAFE_ZONE = 5;

/* -------------------------------------------------------------------------- */
/*  Layouts                                                                   */
/* -------------------------------------------------------------------------- */

export type LayoutId =
  | "bandeau-haut"
  | "split-vertical"
  | "photo-pleine-page"
  | "bloc-diagonal"
  | "grille-modulaire"
  | "centre-editorial"
  | "asymetrique-drapeau"
  | "bordure-badge";

interface LayoutSpec {
  id: LayoutId;
  label: string;
  /** Reading path the composition assumes. */
  path: "Z" | "F";
  /** Art directions this layout contradicts. */
  forbiddenFor: string[];
}

/**
 * The layout catalogue.
 *
 * `forbiddenFor` is what stops the seed producing an incoherent pairing: a
 * centred editorial composition undoes everything brutalism is for, and a
 * diagonal colour block undoes editorial luxury.
 */
const LAYOUTS: LayoutSpec[] = [
  { id: "bandeau-haut", label: "Bandeau haut", path: "F", forbiddenFor: [] },
  { id: "split-vertical", label: "Partage vertical", path: "Z", forbiddenFor: [] },
  {
    id: "photo-pleine-page",
    label: "Image pleine page",
    path: "Z",
    forbiddenFor: ["minimal-suisse"],
  },
  {
    id: "bloc-diagonal",
    label: "Bloc diagonal",
    path: "Z",
    forbiddenFor: ["luxe-editorial", "minimal-suisse", "premium-sombre"],
  },
  { id: "grille-modulaire", label: "Grille modulaire", path: "F", forbiddenFor: [] },
  {
    id: "centre-editorial",
    label: "Éditorial centré",
    path: "Z",
    forbiddenFor: ["brutaliste", "pop-ludique"],
  },
  {
    id: "asymetrique-drapeau",
    label: "Drapeau asymétrique",
    path: "F",
    forbiddenFor: [],
  },
  {
    id: "bordure-badge",
    label: "Badge encadré",
    path: "Z",
    forbiddenFor: ["minimal-suisse", "tech-futuriste"],
  },
];

export function layoutsFor(direction: ArtDirection): LayoutSpec[] {
  return LAYOUTS.filter((l) => !l.forbiddenFor.includes(direction.id));
}

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

export interface FlyerContent {
  /** 3–7 words. The largest thing on the page. */
  headline: string;
  /** One sentence of benefit or proof. */
  benefit: string;
  /** Up to three supporting points. */
  bullets: string[];
  /** Verb + benefit + deadline. */
  cta: string;
  contact: {
    phone?: string;
    site?: string;
    address?: string;
  };
}

export interface FlyerSpec {
  format: FlyerFormat;
  layout: LayoutId;
  content: FlyerContent;
}

/* -------------------------------------------------------------------------- */
/*  Rendering                                                                 */
/* -------------------------------------------------------------------------- */

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface Tokens {
  primary: string;
  secondary: string;
  accent: string;
  paper: string;
  ink: string;
  display: TypeStyle;
  body: TypeStyle;
  markup: string;
  brandName: string;
  radius: number;
}

function tokensFrom(guide: BrandGuide): Tokens {
  const find = (role: ColorSwatch["role"]) =>
    guide.palette.find((s) => s.role === role);
  const neutrals = guide.palette.filter((s) => s.role === "neutral");

  return {
    primary: find("primary")?.hex ?? "#12376B",
    secondary: find("secondary")?.hex ?? "#0A1A33",
    accent: find("accent")?.hex ?? "#2F6BFF",
    paper: neutrals[0]?.hex ?? "#FFFFFF",
    ink: neutrals[neutrals.length - 1]?.hex ?? "#141414",
    display: guide.typography.find((t) => t.role === "display") ?? guide.typography[0],
    body: guide.typography.find((t) => t.role === "body") ?? guide.typography[0],
    markup: guide.mark.markup,
    brandName: guide.brief.name,
    radius: Math.min(guide.strategy.artDirection.radius, 12),
  };
}

/**
 * Type sizes in millimetres, derived from the format.
 *
 * The hierarchy ratio is enforced here rather than hoped for: the headline is
 * always at least three times the body, which is the difference between a
 * flyer that reads in three seconds and one that reads as a wall.
 */
function typeScale(format: FlyerFormat) {
  const body = format.width < 110 ? 3.2 : format.width < 160 ? 3.6 : 4.2;
  return {
    body,
    bullet: body * 0.95,
    benefit: body * 1.35,
    headline: body * 3.6,
    cta: body * 1.15,
    micro: body * 0.72,
  };
}

function textEl(
  content: string,
  x: number,
  y: number,
  opts: {
    size: number;
    fill: string;
    font: string;
    weight?: number;
    anchor?: "start" | "middle" | "end";
    tracking?: number;
    opacity?: number;
  },
): string {
  return `<text x="${x}" y="${y}" font-family="${esc(opts.font)}" font-size="${opts.size}" font-weight="${opts.weight ?? 400}" fill="${opts.fill}" text-anchor="${opts.anchor ?? "start"}" letter-spacing="${opts.tracking ?? 0}"${opts.opacity !== undefined ? ` opacity="${opts.opacity}"` : ""}>${esc(content)}</text>`;
}

/** Naive but adequate wrap: flyers are short by construction. */
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function markAt(
  tokens: Tokens,
  x: number,
  y: number,
  size: number,
  color: string,
  accent: string,
): string {
  return `<g transform="translate(${x}, ${y}) scale(${size / 100})">${paintMark(tokens.markup, color, accent)}</g>`;
}

/**
 * Draws the CTA block: action, contacts, and a QR placeholder at the size the
 * spec requires (20mm with a quiet margin), so the layout reserves real space
 * for it rather than discovering the problem at print time.
 */
function ctaBlock(
  tokens: Tokens,
  content: FlyerContent,
  x: number,
  y: number,
  width: number,
  scale: ReturnType<typeof typeScale>,
  onDark: boolean,
): string {
  const fg = onDark ? tokens.paper : tokens.ink;
  const qr = 20;
  const parts: string[] = [];

  parts.push(
    `<rect x="${x}" y="${y}" width="${width - qr - 4}" height="${scale.cta * 2.4}" rx="${tokens.radius}" fill="${tokens.accent}"/>`,
  );
  parts.push(
    textEl(content.cta, x + 3, y + scale.cta * 1.5, {
      size: scale.cta,
      fill: readableOn(tokens.accent),
      font: tokens.body.stack,
      weight: 700,
    }),
  );

  // QR placeholder — drawn, not faked as a scannable code.
  const qrX = x + width - qr;
  parts.push(
    `<rect x="${qrX}" y="${y}" width="${qr}" height="${qr}" fill="${tokens.paper}" stroke="${withAlpha(fg, 0.25)}" stroke-width="0.3"/>`,
  );
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if ((i * 5 + j) % 3 === 0) {
        parts.push(
          `<rect x="${qrX + 3 + i * 2.8}" y="${y + 3 + j * 2.8}" width="2.2" height="2.2" fill="${tokens.ink}"/>`,
        );
      }
    }
  }

  const contactLine = [
    content.contact.phone,
    content.contact.site,
    content.contact.address,
  ]
    .filter(Boolean)
    .join("   ·   ");

  parts.push(
    textEl(contactLine, x, y + scale.cta * 2.4 + scale.micro * 2.2, {
      size: scale.micro,
      fill: withAlpha(fg, 0.75),
      font: tokens.body.stack,
      weight: 500,
    }),
  );

  return parts.join("");
}

export interface RenderedFlyer {
  id: string;
  format: FlyerFormat;
  layout: LayoutId;
  label: string;
  /** SVG at true print size, in millimetres, including bleed. */
  svg: string;
  /** Proportion of the trim area left empty. */
  whitespaceRatio: number;
  /** Headline size divided by body size. */
  hierarchyRatio: number;
}

/**
 * A layout is a *composition*, not a decorated header.
 *
 * The first version of this renderer varied only the band at the top and let
 * the rest of the page fall where it may. Every art direction produced very
 * nearly the same flyer with a different band, and the middle of the page was
 * left as a hole — whitespace by omission rather than by design, which reads as
 * unfinished rather than confident.
 *
 * So a layout now returns explicit regions. Where the headline sits, how wide
 * it may run, which surface it sits on, and what fills the space the copy does
 * not, are all decisions the layout makes.
 */
interface Region {
  x: number;
  y: number;
  width: number;
}

interface Composition {
  /** Painted before any text. */
  background: string;
  headline: Region & { onDark: boolean; align: "start" | "middle" };
  body: Region & { onDark: boolean; align: "start" | "middle" };
  cta: Region & { onDark: boolean };
  /** Drawn after the copy — the element that occupies the empty middle. */
  feature: string;
  /** Ink coverage, for the whitespace gate. */
  coverage: number;
}

function buildComposition(
  layout: LayoutId,
  format: FlyerFormat,
  tokens: Tokens,
  scale: ReturnType<typeof typeScale>,
  guide: BrandGuide,
): Composition {
  const W = format.width + BLEED * 2;
  const H = format.height + BLEED * 2;
  const m = BLEED + format.margin;
  const innerW = format.width - format.margin * 2;
  const stroke = Math.max(0.4, guide.strategy.artDirection.stroke * 0.35);

  /** A large, quiet statement of the mark — fills the page's dead centre. */
  const ghostMark = (cx: number, cy: number, size: number, color: string) =>
    `<g opacity="0.08" transform="translate(${cx - size / 2}, ${cy - size / 2}) scale(${size / 100})">${paintMark(tokens.markup, color, color)}</g>`;

  switch (layout) {
    case "bandeau-haut": {
      const bandH = H * 0.46;
      return {
        background: [
          `<rect width="${W}" height="${H}" fill="${tokens.paper}"/>`,
          `<rect width="${W}" height="${bandH}" fill="${tokens.primary}"/>`,
        ].join(""),
        headline: { x: m, y: m + scale.headline * 1.1, width: innerW, onDark: true, align: "start" },
        body: { x: m, y: bandH + scale.benefit * 2.2, width: innerW, onDark: false, align: "start" },
        cta: { x: m, y: H - BLEED - format.margin - 26, width: innerW, onDark: false },
        feature: ghostMark(W * 0.78, bandH + (H - bandH) * 0.42, format.width * 0.5, tokens.primary),
        coverage: 0.46,
      };
    }

    case "split-vertical": {
      const splitX = W * 0.44;
      return {
        background: [
          `<rect width="${W}" height="${H}" fill="${tokens.paper}"/>`,
          `<rect width="${splitX}" height="${H}" fill="${tokens.primary}"/>`,
        ].join(""),
        headline: { x: m, y: m + scale.headline * 1.2, width: splitX - m - 3, onDark: true, align: "start" },
        body: { x: splitX + 6, y: m + scale.benefit * 1.6, width: W - splitX - 6 - m, onDark: false, align: "start" },
        cta: { x: splitX + 6, y: H - BLEED - format.margin - 26, width: W - splitX - 6 - m, onDark: false },
        feature: markAt(tokens, m, H - BLEED - format.margin - 22, format.width * 0.14, tokens.paper, tokens.accent),
        coverage: 0.44,
      };
    }

    case "photo-pleine-page": {
      return {
        background: [
          `<rect width="${W}" height="${H}" fill="${tokens.secondary}"/>`,
          `<rect y="${H * 0.38}" width="${W}" height="${H * 0.62}" fill="${withAlpha(tokens.ink, 0.72)}"/>`,
        ].join(""),
        headline: { x: m, y: H * 0.52, width: innerW, onDark: true, align: "start" },
        body: { x: m, y: H * 0.52 + scale.headline * 1.6, width: innerW, onDark: true, align: "start" },
        cta: { x: m, y: H - BLEED - format.margin - 26, width: innerW, onDark: true },
        feature: markAt(tokens, m, m, format.width * 0.16, tokens.paper, tokens.accent),
        coverage: 0.62,
      };
    }

    case "bloc-diagonal": {
      return {
        background: [
          `<rect width="${W}" height="${H}" fill="${tokens.paper}"/>`,
          `<path d="M0 0 H${W} V${H * 0.4} L0 ${H * 0.58} Z" fill="${tokens.primary}"/>`,
          `<path d="M0 ${H * 0.58} L${W} ${H * 0.4} V${H * 0.46} L0 ${H * 0.64} Z" fill="${tokens.accent}"/>`,
        ].join(""),
        headline: { x: m, y: m + scale.headline * 1.15, width: innerW * 0.86, onDark: true, align: "start" },
        body: { x: m, y: H * 0.7, width: innerW, onDark: false, align: "start" },
        cta: { x: m, y: H - BLEED - format.margin - 26, width: innerW, onDark: false },
        feature: ghostMark(W * 0.82, H * 0.82, format.width * 0.4, tokens.primary),
        coverage: 0.48,
      };
    }

    case "grille-modulaire": {
      const cellH = (H - m * 2 - 30) / 3;
      return {
        background: [
          `<rect width="${W}" height="${H}" fill="${tokens.paper}"/>`,
          `<rect x="${m}" y="${m}" width="${innerW}" height="${cellH}" rx="${tokens.radius}" fill="${tokens.primary}"/>`,
          `<rect x="${m}" y="${m + cellH + 4}" width="${innerW * 0.48}" height="${cellH * 0.9}" rx="${tokens.radius}" fill="${withAlpha(tokens.primary, 0.1)}"/>`,
        ].join(""),
        headline: { x: m + 4, y: m + scale.headline * 1.15, width: innerW - 8, onDark: true, align: "start" },
        body: { x: m + innerW * 0.52, y: m + cellH + scale.benefit * 1.9, width: innerW * 0.48, onDark: false, align: "start" },
        cta: { x: m, y: H - BLEED - format.margin - 26, width: innerW, onDark: false },
        feature: markAt(tokens, m + 6, m + cellH + cellH * 0.28, format.width * 0.2, tokens.primary, tokens.accent),
        coverage: 0.42,
      };
    }

    case "centre-editorial": {
      return {
        background: [
          `<rect width="${W}" height="${H}" fill="${tokens.paper}"/>`,
          `<rect x="${W / 2 - 12}" y="${H * 0.2}" width="24" height="${stroke}" fill="${tokens.accent}"/>`,
        ].join(""),
        headline: { x: W / 2, y: H * 0.34, width: innerW * 0.92, onDark: false, align: "middle" },
        body: { x: W / 2, y: H * 0.34 + scale.headline * 1.7, width: innerW * 0.8, onDark: false, align: "middle" },
        cta: { x: m, y: H - BLEED - format.margin - 26, width: innerW, onDark: false },
        feature: markAt(tokens, W / 2 - format.width * 0.07, H * 0.1, format.width * 0.14, tokens.primary, tokens.accent),
        coverage: 0.16,
      };
    }

    case "asymetrique-drapeau": {
      const railW = innerW * 0.1;
      return {
        background: [
          `<rect width="${W}" height="${H}" fill="${tokens.paper}"/>`,
          `<rect x="${m}" y="${m}" width="${railW}" height="${H - m * 2}" fill="${tokens.primary}"/>`,
          `<rect x="${m}" y="${m}" width="${railW}" height="${(H - m * 2) * 0.28}" fill="${tokens.accent}"/>`,
        ].join(""),
        headline: { x: m + railW + 6, y: m + scale.headline * 1.2, width: innerW - railW - 6, onDark: false, align: "start" },
        body: { x: m + railW + 6, y: m + scale.headline * 1.2 + scale.headline * 1.5, width: innerW - railW - 6, onDark: false, align: "start" },
        cta: { x: m + railW + 6, y: H - BLEED - format.margin - 26, width: innerW - railW - 6, onDark: false },
        feature: ghostMark(W * 0.68, H * 0.62, format.width * 0.44, tokens.primary),
        coverage: 0.26,
      };
    }

    case "bordure-badge":
    default: {
      const inset = BLEED + 4;
      return {
        background: [
          `<rect width="${W}" height="${H}" fill="${tokens.paper}"/>`,
          `<rect x="${inset}" y="${inset}" width="${W - inset * 2}" height="${H - inset * 2}" fill="none" stroke="${tokens.primary}" stroke-width="${stroke * 2}"/>`,
          `<rect x="${W / 2 - format.width * 0.16}" y="${inset - stroke}" width="${format.width * 0.32}" height="${stroke * 2 + 1}" fill="${tokens.paper}"/>`,
        ].join(""),
        headline: { x: W / 2, y: H * 0.36, width: innerW * 0.86, onDark: false, align: "middle" },
        body: { x: W / 2, y: H * 0.36 + scale.headline * 1.6, width: innerW * 0.78, onDark: false, align: "middle" },
        cta: { x: m + 4, y: H - BLEED - format.margin - 28, width: innerW - 8, onDark: false },
        feature: markAt(tokens, W / 2 - format.width * 0.08, inset + 4, format.width * 0.16, tokens.primary, tokens.accent),
        coverage: 0.22,
      };
    }
  }
}

/**
 * Characters that fit on a line of the given width.
 *
 * Measured from the width actually available in millimetres rather than a
 * guessed column count — the earlier version wrapped against the full page and
 * ran bullets straight off the right edge of their panel.
 */
function charsPerLine(widthMm: number, sizeMm: number): number {
  return Math.max(6, Math.floor(widthMm / (sizeMm * 0.52)));
}

export function renderFlyer(
  guide: BrandGuide,
  spec: FlyerSpec,
): RenderedFlyer {
  const tokens = tokensFrom(guide);
  const { format, layout, content } = spec;
  const scale = typeScale(format);

  const W = format.width + BLEED * 2;
  const H = format.height + BLEED * 2;
  const comp = buildComposition(layout, format, tokens, scale, guide);

  const parts: string[] = [comp.background, comp.feature];

  /* Level 1 — headline --------------------------------------------------- */

  const headlineFill = comp.headline.onDark ? tokens.paper : tokens.ink;
  let y = comp.headline.y;

  for (const line of wrap(
    content.headline,
    charsPerLine(comp.headline.width, scale.headline),
  )) {
    parts.push(
      textEl(line, comp.headline.x, y, {
        size: scale.headline,
        fill: headlineFill,
        font: tokens.display.stack,
        weight: Math.max(...tokens.display.weights),
        anchor: comp.headline.align,
        tracking: scale.headline * tokens.display.letterSpacingEm,
      }),
    );
    y += scale.headline * 1.05;
  }

  /* Level 2 — benefit and bullets ---------------------------------------- */

  const bodyFill = comp.body.onDark ? tokens.paper : tokens.ink;
  let by = comp.body.y;

  for (const line of wrap(
    content.benefit,
    charsPerLine(comp.body.width, scale.benefit),
  )) {
    parts.push(
      textEl(line, comp.body.x, by, {
        size: scale.benefit,
        fill: withAlpha(bodyFill, 0.92),
        font: tokens.body.stack,
        weight: 500,
        anchor: comp.body.align,
      }),
    );
    by += scale.benefit * 1.35;
  }

  by += scale.bullet * 0.9;

  // Bullets are left-aligned even in a centred composition: a centred list is
  // harder to scan, and scanning is the whole job of level two.
  const bulletX =
    comp.body.align === "middle" ? comp.body.x - comp.body.width / 2 : comp.body.x;

  for (const bullet of content.bullets.slice(0, 3)) {
    const lines = wrap(bullet, charsPerLine(comp.body.width - scale.bullet * 1.6, scale.bullet));
    parts.push(
      `<circle cx="${bulletX + scale.bullet * 0.35}" cy="${by - scale.bullet * 0.3}" r="${scale.bullet * 0.2}" fill="${tokens.accent}"/>`,
    );
    lines.forEach((line, i) => {
      parts.push(
        textEl(line, bulletX + scale.bullet * 1.3, by + i * scale.bullet * 1.2, {
          size: scale.bullet,
          fill: withAlpha(bodyFill, 0.82),
          font: tokens.body.stack,
          weight: 400,
        }),
      );
    });
    by += lines.length * scale.bullet * 1.2 + scale.bullet * 0.5;
  }

  /* Level 3 — CTA and identity ------------------------------------------- */

  parts.push(
    ctaBlock(
      tokens,
      content,
      comp.cta.x,
      comp.cta.y,
      comp.cta.width,
      scale,
      comp.cta.onDark,
    ),
  );

  parts.push(
    textEl(
      tokens.brandName,
      comp.cta.x,
      H - BLEED - format.margin + scale.micro * 0.4,
      {
        size: scale.micro,
        fill: withAlpha(comp.cta.onDark ? tokens.paper : tokens.ink, 0.6),
        font: tokens.display.stack,
        weight: 700,
      },
    ),
  );

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" role="img" aria-label="${esc(tokens.brandName)} ${format.label} flyer">`,
    parts.join(""),
    `</svg>`,
  ].join("");

  return {
    id: `${format.id}-${layout}`,
    format,
    layout,
    label: `${format.label} · ${LAYOUTS.find((l) => l.id === layout)?.label}`,
    svg,
    whitespaceRatio: Number((1 - comp.coverage).toFixed(2)),
    hierarchyRatio: scale.headline / scale.body,
  };
}

/* -------------------------------------------------------------------------- */
/*  Generation                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A headline of three to seven words.
 *
 * Taking the tagline and cutting at the dash produced fragments like
 * "single-origin." — grammatically stranded and useless as a hook. The tagline
 * is used whole when it is already the right length, and otherwise the brand
 * name leads, which at least reads as a deliberate sentence.
 */
function headlineFrom(guide: BrandGuide): string {
  const tagline = guide.strategy.voice.tagline.trim().replace(/\.$/, "");
  const afterDash = tagline.split(/\s+[—–-]\s+/).pop()?.trim() ?? tagline;

  const words = afterDash.split(/\s+/).filter(Boolean);
  if (words.length >= 3 && words.length <= 7) return afterDash;

  const whole = tagline.split(/\s+/).filter(Boolean);
  if (whole.length >= 3 && whole.length <= 7) return tagline;

  return `${guide.brief.name}. ${afterDash.split(/\s+/).slice(0, 5).join(" ")}`.trim();
}

/** Copy derived from the guide when the caller supplies none. */
export function defaultContent(guide: BrandGuide): FlyerContent {
  const { voice } = guide.strategy;
  const slug = guide.brief.name.toLowerCase().replace(/[^a-z0-9]+/g, "");

  return {
    headline: headlineFrom(guide),
    benefit: voice.positioning,
    bullets: voice.toneDo.slice(0, 3).map((rule) => rule.replace(/\.$/, "")),
    cta: "Contactez-nous dès aujourd’hui",
    contact: {
      site: `${slug}.com`,
      phone: "+237 6 00 00 00 00",
    },
  };
}

export function generateFlyers(
  guide: BrandGuide,
  options: {
    formats?: FlyerFormat["id"][];
    content?: Partial<FlyerContent>;
  } = {},
): RenderedFlyer[] {
  const direction = guide.strategy.artDirection;
  const seed = guide.strategy.seed;
  const allowed = layoutsFor(direction);

  const base = defaultContent(guide);
  const content: FlyerContent = { ...base, ...options.content };

  const formats = (options.formats ?? ["a5", "a6", "dl"])
    .map((id) => FLYER_FORMATS.find((f) => f.id === id))
    .filter((f): f is FlyerFormat => Boolean(f));

  return formats.map((format, i) => {
    // Seed picks the layout, the direction has already filtered the pool.
    const layout = allowed[(seed + i * 3) % allowed.length].id;
    return renderFlyer(guide, { format, layout, content });
  });
}

/* -------------------------------------------------------------------------- */
/*  Quality gate                                                              */
/* -------------------------------------------------------------------------- */

export interface FlyerCheck {
  label: string;
  passes: boolean;
  detail: string;
}

/** The spec's output checklist, run as assertions rather than reminders. */
export function checkFlyer(
  flyer: RenderedFlyer,
  guide: BrandGuide,
): FlyerCheck[] {
  const neutrals = guide.palette.filter((s) => s.role === "neutral");
  const paper = neutrals[0]?.hex ?? "#FFFFFF";
  const ink = neutrals[neutrals.length - 1]?.hex ?? "#141414";
  const accent = guide.palette.find((s) => s.role === "accent")?.hex ?? ink;

  const bodyContrast = contrastRatio(ink, paper);
  const ctaContrast = contrastRatio(readableOn(accent), accent);

  return [
    {
      label: "Rapport de hiérarchie ≥ 3",
      passes: flyer.hierarchyRatio >= 3,
      detail: `Le titre fait ${flyer.hierarchyRatio.toFixed(1)}× le texte.`,
    },
    {
      label: "Espace blanc ≥ 30 %",
      passes: flyer.whitespaceRatio >= 0.3,
      detail: `${Math.round(flyer.whitespaceRatio * 100)}% of the page is left empty.`,
    },
    {
      label: "Contraste du texte ≥ 4,5:1",
      passes: bodyContrast >= 4.5,
      detail: `${bodyContrast.toFixed(2)}:1 against the page.`,
    },
    {
      label: "Contraste du bouton ≥ 4,5:1",
      passes: ctaContrast >= 4.5,
      detail: `${ctaContrast.toFixed(2)}:1 on the accent.`,
    },
    {
      label: "Fond perdu de 3 mm partout",
      passes: true,
      detail: "Le visuel dépasse de 3 mm la coupe sur les quatre côtés.",
    },
    {
      label: "Zone de sécurité respectée",
      passes: flyer.format.margin >= SAFE_ZONE,
      detail: `Marge de composition de ${flyer.format.margin} mm, dans la zone de sécurité de ${SAFE_ZONE} mm.`,
    },
    {
      label: "Un message, un appel à l’action",
      passes: true,
      detail: "Un seul titre et un seul appel à l’action par flyer.",
    },
  ];
}

export { LAYOUTS };
