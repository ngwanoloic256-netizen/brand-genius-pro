import { darken, isDark, lighten, mix, readableOn, withAlpha } from "../color";
import { paintMark } from "./mark-tokens";
import { PHOTO_SCENES, renderPhotoScene } from "./photo-scenes";
import type { ArtDirection } from "./art-direction";
import type {
  ColorSwatch,
  Mockup,
  MockupCategory,
  MockupFamily,
  TypeStyle,
} from "../types";
import { primaryColor } from "../types";

/**
 * Step 3 of the pipeline: brand tokens → a set of contextual mockups.
 *
 * Mockups are composed as vector scenes rather than sampled from an image
 * model, which is what lets the variety rule be enforced rather than hoped for:
 * every scene knows its composition family, so the selector can guarantee no
 * two consecutive mockups share a camera angle or support type, and no scene
 * template is ever reused inside one project.
 */

export interface SceneContext {
  brandName: string;
  tagline: string;
  /** Raw mark markup with colour placeholders still in it. */
  markup: string;
  primary: string;
  secondary: string;
  accent: string;
  paper: string;
  mist: string;
  ink: string;
  displayFont: string;
  bodyFont: string;
}

interface SceneTemplate {
  id: string;
  title: string;
  category: MockupCategory;
  family: MockupFamily;
  width: number;
  height: number;
  render: (ctx: SceneContext) => string;
}

/* -------------------------------------------------------------------------- */
/*  Shared SVG helpers                                                        */
/* -------------------------------------------------------------------------- */

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Places the mark scaled into a box at (x, y) with the given size. */
function mark(
  ctx: SceneContext,
  x: number,
  y: number,
  size: number,
  markColor: string,
  accentColor: string,
  extra = "",
): string {
  const painted = paintMark(ctx.markup, markColor, accentColor);
  return `<g transform="translate(${x}, ${y}) scale(${size / 100})" ${extra}>${painted}</g>`;
}

function text(
  content: string,
  opts: {
    x: number;
    y: number;
    size: number;
    fill: string;
    font: string;
    weight?: number;
    anchor?: "start" | "middle" | "end";
    letterSpacing?: number;
    opacity?: number;
    transform?: string;
  },
): string {
  return `<text x="${opts.x}" y="${opts.y}" font-family="${esc(opts.font)}" font-size="${opts.size}" font-weight="${opts.weight ?? 500}" fill="${opts.fill}" text-anchor="${opts.anchor ?? "start"}" letter-spacing="${opts.letterSpacing ?? 0}"${opts.opacity !== undefined ? ` opacity="${opts.opacity}"` : ""}${opts.transform ? ` transform="${opts.transform}"` : ""}>${esc(content)}</text>`;
}

function defs(...blocks: string[]): string {
  return `<defs>${blocks.join("")}</defs>`;
}

function softShadow(id: string, dy = 18, blur = 22, opacity = 0.28): string {
  return `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="#0B0B0F" flood-opacity="${opacity}"/></filter>`;
}

function linearGradient(
  id: string,
  from: string,
  to: string,
  angle = 90,
): string {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x1 = 50 + Math.cos(rad + Math.PI) * 50;
  const y1 = 50 + Math.sin(rad + Math.PI) * 50;
  const x2 = 50 + Math.cos(rad) * 50;
  const y2 = 50 + Math.sin(rad) * 50;
  return `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient>`;
}

function svg(w: number, h: number, body: string, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;
}

/** Surface the scenes sit on — kept subtly tinted by the brand, never grey. */
function studioFloor(ctx: SceneContext, w: number, h: number, tone = 0.9): string {
  const base = mix(ctx.mist, ctx.paper, tone);
  return `<rect width="${w}" height="${h}" fill="${base}"/><rect width="${w}" height="${h}" fill="url(#floorGrad)"/>`;
}

/* -------------------------------------------------------------------------- */
/*  Family: flat-lay                                                          */
/* -------------------------------------------------------------------------- */

const businessCards: SceneTemplate = {
  id: "business-card-pair",
  title: "Cartes de visite",
  category: "print",
  family: "flat-lay",
  width: 1200,
  height: 900,
  render: (ctx) =>
    svg(
      1200,
      900,
      [
        defs(
          softShadow("cardShadow", 14, 18, 0.22),
          linearGradient("floorGrad", withAlpha(ctx.primary, 0.06), withAlpha(ctx.ink, 0.02), 135),
        ),
        studioFloor(ctx, 1200, 900),
        // Back card — reverse side, full colour
        `<g transform="rotate(-8 620 470)" filter="url(#cardShadow)">`,
        `<rect x="560" y="290" width="520" height="300" rx="10" fill="${ctx.primary}"/>`,
        mark(ctx, 780, 370, 80, ctx.paper, lighten(ctx.accent, 0.3)),
        text(ctx.brandName, {
          x: 820,
          y: 505,
          size: 26,
          fill: ctx.paper,
          font: ctx.displayFont,
          weight: 700,
          anchor: "middle",
          letterSpacing: 1,
        }),
        `</g>`,
        // Front card — light side with details
        `<g transform="rotate(5 480 540)" filter="url(#cardShadow)">`,
        `<rect x="180" y="400" width="520" height="300" rx="10" fill="${ctx.paper}"/>`,
        mark(ctx, 218, 438, 56, ctx.primary, ctx.accent),
        text(ctx.brandName, {
          x: 218,
          y: 560,
          size: 30,
          fill: ctx.ink,
          font: ctx.displayFont,
          weight: 700,
        }),
        text(ctx.tagline, {
          x: 218,
          y: 590,
          size: 15,
          fill: withAlpha(ctx.ink, 0.62),
          font: ctx.bodyFont,
          weight: 400,
        }),
        `<rect x="218" y="618" width="60" height="3" rx="1.5" fill="${ctx.accent}"/>`,
        text("contact@" + slug(ctx.brandName) + ".com", {
          x: 218,
          y: 660,
          size: 14,
          fill: withAlpha(ctx.ink, 0.7),
          font: ctx.bodyFont,
          weight: 400,
        }),
        `</g>`,
      ].join(""),
      `${ctx.brandName} business cards`,
    ),
};

const stationerySet: SceneTemplate = {
  id: "stationery-set",
  title: "Papier à en-tête et enveloppe",
  category: "print",
  family: "flat-lay",
  width: 1000,
  height: 1250,
  render: (ctx) =>
    svg(
      1000,
      1250,
      [
        defs(
          softShadow("paperShadow", 16, 20, 0.18),
          linearGradient("floorGrad", withAlpha(ctx.secondary, 0.08), withAlpha(ctx.ink, 0.02), 160),
        ),
        studioFloor(ctx, 1000, 1250, 0.82),
        // A4 letterhead
        `<g transform="rotate(-3 500 520)" filter="url(#paperShadow)">`,
        `<rect x="180" y="120" width="640" height="900" rx="4" fill="${ctx.paper}"/>`,
        `<rect x="180" y="120" width="640" height="14" fill="${ctx.primary}"/>`,
        mark(ctx, 232, 186, 48, ctx.primary, ctx.accent),
        text(ctx.brandName, {
          x: 292,
          y: 220,
          size: 24,
          fill: ctx.ink,
          font: ctx.displayFont,
          weight: 700,
        }),
        ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(
          (i) =>
            `<rect x="232" y="${330 + i * 34}" width="${i === 8 ? 240 : 536 - (i % 3) * 48}" height="9" rx="4.5" fill="${withAlpha(ctx.ink, i === 0 ? 0.5 : 0.16)}"/>`,
        ),
        `<rect x="232" y="700" width="180" height="9" rx="4.5" fill="${withAlpha(ctx.accent, 0.7)}"/>`,
        text(`${slug(ctx.brandName)}.com`, {
          x: 232,
          y: 972,
          size: 13,
          fill: withAlpha(ctx.ink, 0.5),
          font: ctx.bodyFont,
          weight: 400,
        }),
        `</g>`,
        // Envelope tucked underneath
        `<g transform="rotate(6 560 1080)" filter="url(#paperShadow)">`,
        `<rect x="300" y="980" width="520" height="300" rx="6" fill="${mix(ctx.paper, ctx.mist, 0.5)}"/>`,
        `<path d="M300 980 L560 1130 L820 980 Z" fill="${withAlpha(ctx.ink, 0.06)}"/>`,
        mark(ctx, 340, 1180, 44, ctx.primary, ctx.accent),
        text(ctx.brandName, {
          x: 396,
          y: 1210,
          size: 18,
          fill: ctx.ink,
          font: ctx.displayFont,
          weight: 600,
        }),
        `</g>`,
      ].join(""),
      `${ctx.brandName} stationery`,
    ),
};

const cardStack: SceneTemplate = {
  id: "card-stack-edge",
  title: "Pile de cartes",
  category: "print",
  family: "flat-lay",
  width: 1100,
  height: 800,
  render: (ctx) => {
    const layers = [0, 1, 2, 3, 4, 5];
    return svg(
      1100,
      800,
      [
        defs(
          softShadow("stackShadow", 22, 26, 0.26),
          linearGradient("floorGrad", withAlpha(ctx.accent, 0.07), withAlpha(ctx.ink, 0.03), 200),
        ),
        studioFloor(ctx, 1100, 800, 0.75),
        `<g filter="url(#stackShadow)">`,
        ...layers.map((i) => {
          const y = 520 - i * 22;
          const x = 300 + i * 6;
          const face = i % 2 === 0 ? ctx.paper : ctx.primary;
          return `<rect x="${x}" y="${y}" width="500" height="26" rx="4" fill="${face}"/><rect x="${x}" y="${y}" width="500" height="4" rx="2" fill="${withAlpha(ctx.ink, 0.08)}"/>`;
        }),
        // Top card, face up
        `<g transform="translate(336, 258) rotate(-2)">`,
        `<rect width="500" height="290" rx="8" fill="${ctx.paper}"/>`,
        `<rect width="500" height="290" rx="8" fill="none" stroke="${withAlpha(ctx.ink, 0.06)}"/>`,
        mark(ctx, 40, 44, 60, ctx.primary, ctx.accent),
        text(ctx.brandName, {
          x: 40,
          y: 176,
          size: 28,
          fill: ctx.ink,
          font: ctx.displayFont,
          weight: 700,
        }),
        text(ctx.tagline, {
          x: 40,
          y: 206,
          size: 14,
          fill: withAlpha(ctx.ink, 0.6),
          font: ctx.bodyFont,
          weight: 400,
        }),
        `<circle cx="440" cy="238" r="18" fill="${ctx.accent}"/>`,
        `</g>`,
        `</g>`,
      ].join(""),
      `${ctx.brandName} printed card stack`,
    );
  },
};

/* -------------------------------------------------------------------------- */
/*  Family: product-closeup                                                   */
/* -------------------------------------------------------------------------- */

const packagingBox: SceneTemplate = {
  id: "packaging-box",
  title: "Boîte produit",
  category: "packaging",
  family: "product-closeup",
  width: 1000,
  height: 1000,
  render: (ctx) =>
    svg(
      1000,
      1000,
      [
        defs(
          softShadow("boxShadow", 30, 30, 0.3),
          linearGradient("floorGrad", withAlpha(ctx.primary, 0.1), withAlpha(ctx.ink, 0.04), 180),
          linearGradient("boxTop", lighten(ctx.primary, 0.16), ctx.primary, 160),
          linearGradient("boxSide", darken(ctx.primary, 0.24), darken(ctx.primary, 0.38), 120),
        ),
        studioFloor(ctx, 1000, 1000, 0.7),
        `<ellipse cx="520" cy="830" rx="300" ry="42" fill="${withAlpha(ctx.ink, 0.14)}"/>`,
        `<g filter="url(#boxShadow)">`,
        // Front face
        `<path d="M280 340 L620 400 L620 810 L280 750 Z" fill="${ctx.primary}"/>`,
        // Side face
        `<path d="M620 400 L820 320 L820 720 L620 810 Z" fill="url(#boxSide)"/>`,
        // Top face
        `<path d="M280 340 L480 262 L820 320 L620 400 Z" fill="url(#boxTop)"/>`,
        `</g>`,
        // Front artwork
        `<g transform="translate(320, 420) skewY(10)">`,
        mark(ctx, 0, 0, 92, ctx.paper, lighten(ctx.accent, 0.35)),
        text(ctx.brandName, {
          x: 0,
          y: 168,
          size: 30,
          fill: ctx.paper,
          font: ctx.displayFont,
          weight: 700,
          letterSpacing: 0.5,
        }),
        `<rect x="0" y="192" width="64" height="4" rx="2" fill="${ctx.accent}"/>`,
        text(ctx.tagline, {
          x: 0,
          y: 232,
          size: 14,
          fill: withAlpha(ctx.paper, 0.78),
          font: ctx.bodyFont,
          weight: 400,
        }),
        `</g>`,
        // Side band
        `<g transform="translate(660, 470) skewY(-22)">`,
        text(ctx.brandName.toUpperCase(), {
          x: 0,
          y: 0,
          size: 18,
          fill: withAlpha(ctx.paper, 0.6),
          font: ctx.displayFont,
          weight: 600,
          letterSpacing: 4,
        }),
        `</g>`,
      ].join(""),
      `${ctx.brandName} packaging box`,
    ),
};

const pouchPack: SceneTemplate = {
  id: "stand-up-pouch",
  title: "Sachet doypack",
  category: "packaging",
  family: "product-closeup",
  width: 900,
  height: 1150,
  render: (ctx) =>
    svg(
      900,
      1150,
      [
        defs(
          softShadow("pouchShadow", 24, 26, 0.28),
          linearGradient("floorGrad", withAlpha(ctx.secondary, 0.12), withAlpha(ctx.ink, 0.03), 200),
          linearGradient("pouchFace", lighten(ctx.secondary, 0.08), darken(ctx.secondary, 0.14), 105),
          linearGradient("gloss", withAlpha("#FFFFFF", 0.22), withAlpha("#FFFFFF", 0), 90),
        ),
        studioFloor(ctx, 900, 1150, 0.72),
        `<ellipse cx="450" cy="1010" rx="230" ry="34" fill="${withAlpha(ctx.ink, 0.16)}"/>`,
        `<g filter="url(#pouchShadow)">`,
        `<path d="M240 210 Q450 178 660 210 L680 940 Q450 1000 220 940 Z" fill="url(#pouchFace)"/>`,
        `<path d="M240 210 Q450 178 660 210 L664 262 Q450 232 236 262 Z" fill="${withAlpha(ctx.ink, 0.22)}"/>`,
        `<path d="M240 210 Q340 190 380 200 L392 940 Q300 962 226 940 Z" fill="url(#gloss)"/>`,
        `</g>`,
        mark(ctx, 380, 360, 140, ctx.paper, lighten(ctx.accent, 0.3)),
        text(ctx.brandName, {
          x: 450,
          y: 590,
          size: 44,
          fill: ctx.paper,
          font: ctx.displayFont,
          weight: 700,
          anchor: "middle",
        }),
        `<rect x="390" y="620" width="120" height="4" rx="2" fill="${ctx.accent}"/>`,
        text(ctx.tagline, {
          x: 450,
          y: 668,
          size: 17,
          fill: withAlpha(ctx.paper, 0.76),
          font: ctx.bodyFont,
          weight: 400,
          anchor: "middle",
        }),
        `<rect x="360" y="800" width="180" height="52" rx="26" fill="${ctx.accent}"/>`,
        text("250 g", {
          x: 450,
          y: 833,
          size: 20,
          fill: readableOn(ctx.accent),
          font: ctx.displayFont,
          weight: 700,
          anchor: "middle",
        }),
      ].join(""),
      `${ctx.brandName} pouch packaging`,
    ),
};

const bottleLabel: SceneTemplate = {
  id: "bottle-label",
  title: "Étiquette de bouteille",
  category: "packaging",
  family: "product-closeup",
  width: 850,
  height: 1200,
  render: (ctx) =>
    svg(
      850,
      1200,
      [
        defs(
          softShadow("bottleShadow", 22, 24, 0.26),
          linearGradient("floorGrad", withAlpha(ctx.accent, 0.08), withAlpha(ctx.ink, 0.04), 190),
          linearGradient("glass", withAlpha(ctx.ink, 0.14), withAlpha(ctx.ink, 0.3), 100),
        ),
        studioFloor(ctx, 850, 1200, 0.68),
        `<ellipse cx="425" cy="1080" rx="180" ry="30" fill="${withAlpha(ctx.ink, 0.16)}"/>`,
        `<g filter="url(#bottleShadow)">`,
        `<path d="M355 130 h140 v96 q0 30 24 52 l32 30 q34 32 34 78 v646 q0 34 -34 34 h-252 q-34 0 -34 -34 v-646 q0 -46 34 -78 l32 -30 q24 -22 24 -52 z" fill="url(#glass)"/>`,
        `<rect x="349" y="96" width="152" height="46" rx="10" fill="${darken(ctx.secondary, 0.2)}"/>`,
        `</g>`,
        // Wrap label
        `<rect x="255" y="520" width="340" height="380" rx="6" fill="${ctx.paper}"/>`,
        `<rect x="255" y="520" width="340" height="10" fill="${ctx.primary}"/>`,
        `<rect x="255" y="890" width="340" height="10" fill="${ctx.primary}"/>`,
        mark(ctx, 380, 566, 90, ctx.primary, ctx.accent),
        text(ctx.brandName, {
          x: 425,
          y: 726,
          size: 34,
          fill: ctx.ink,
          font: ctx.displayFont,
          weight: 700,
          anchor: "middle",
        }),
        `<rect x="385" y="750" width="80" height="3" rx="1.5" fill="${ctx.accent}"/>`,
        text(ctx.tagline, {
          x: 425,
          y: 790,
          size: 14,
          fill: withAlpha(ctx.ink, 0.62),
          font: ctx.bodyFont,
          weight: 400,
          anchor: "middle",
        }),
        text("500 ML", {
          x: 425,
          y: 858,
          size: 13,
          fill: withAlpha(ctx.ink, 0.5),
          font: ctx.bodyFont,
          weight: 600,
          anchor: "middle",
          letterSpacing: 3,
        }),
        // Gloss highlight over the whole bottle
        `<path d="M320 200 q-18 60 -18 200 v580 q0 20 18 24 v-804 z" fill="${withAlpha("#FFFFFF", 0.18)}"/>`,
      ].join(""),
      `${ctx.brandName} bottle label`,
    ),
};

const takeawayCup: SceneTemplate = {
  id: "takeaway-cup",
  title: "Gobelet à emporter",
  category: "packaging",
  family: "product-closeup",
  width: 900,
  height: 1000,
  render: (ctx) =>
    svg(
      900,
      1000,
      [
        defs(
          softShadow("cupShadow", 20, 22, 0.26),
          linearGradient("floorGrad", withAlpha(ctx.primary, 0.09), withAlpha(ctx.ink, 0.03), 210),
          linearGradient("cupBody", lighten(ctx.paper, 0.4), mix(ctx.paper, ctx.mist, 0.55), 100),
        ),
        studioFloor(ctx, 900, 1000, 0.74),
        `<ellipse cx="450" cy="880" rx="185" ry="28" fill="${withAlpha(ctx.ink, 0.15)}"/>`,
        `<g filter="url(#cupShadow)">`,
        `<path d="M262 236 L322 862 q4 26 30 26 h196 q26 0 30 -26 L638 236 Z" fill="url(#cupBody)"/>`,
        `<ellipse cx="450" cy="236" rx="188" ry="34" fill="${darken(ctx.secondary, 0.18)}"/>`,
        `<ellipse cx="450" cy="228" rx="188" ry="34" fill="${ctx.secondary}"/>`,
        `<ellipse cx="450" cy="228" rx="150" ry="24" fill="${darken(ctx.secondary, 0.28)}"/>`,
        `</g>`,
        // Sleeve
        `<path d="M300 470 L620 470 L604 690 L316 690 Z" fill="${ctx.primary}"/>`,
        mark(ctx, 330, 500, 76, ctx.paper, lighten(ctx.accent, 0.3)),
        text(ctx.brandName, {
          x: 424,
          y: 566,
          size: 30,
          fill: ctx.paper,
          font: ctx.displayFont,
          weight: 700,
        }),
        text(ctx.tagline, {
          x: 424,
          y: 596,
          size: 13,
          fill: withAlpha(ctx.paper, 0.72),
          font: ctx.bodyFont,
          weight: 400,
        }),
        `<rect x="330" y="628" width="52" height="3" rx="1.5" fill="${ctx.accent}"/>`,
      ].join(""),
      `${ctx.brandName} takeaway cup`,
    ),
};

/* -------------------------------------------------------------------------- */
/*  Family: digital-screen                                                    */
/* -------------------------------------------------------------------------- */

const phoneApp: SceneTemplate = {
  id: "phone-app",
  title: "Application mobile",
  category: "digital",
  family: "digital-screen",
  width: 900,
  height: 1150,
  render: (ctx) =>
    svg(
      900,
      1150,
      [
        defs(
          softShadow("phoneShadow", 28, 30, 0.3),
          linearGradient("floorGrad", withAlpha(ctx.secondary, 0.14), withAlpha(ctx.ink, 0.05), 165),
          linearGradient("heroGrad", ctx.primary, darken(ctx.secondary, 0.1), 145),
        ),
        studioFloor(ctx, 900, 1150, 0.6),
        `<g filter="url(#phoneShadow)">`,
        `<rect x="230" y="90" width="440" height="900" rx="56" fill="${darken(ctx.ink, 0.3)}"/>`,
        `<rect x="244" y="104" width="412" height="872" rx="46" fill="${ctx.paper}"/>`,
        `</g>`,
        `<clipPath id="screenClip"><rect x="244" y="104" width="412" height="872" rx="46"/></clipPath>`,
        `<g clip-path="url(#screenClip)">`,
        // Hero panel
        `<rect x="244" y="104" width="412" height="330" fill="url(#heroGrad)"/>`,
        mark(ctx, 276, 150, 44, ctx.paper, lighten(ctx.accent, 0.35)),
        text(ctx.brandName, {
          x: 276,
          y: 268,
          size: 30,
          fill: ctx.paper,
          font: ctx.displayFont,
          weight: 700,
        }),
        text(ctx.tagline, {
          x: 276,
          y: 300,
          size: 14,
          fill: withAlpha(ctx.paper, 0.78),
          font: ctx.bodyFont,
          weight: 400,
        }),
        `<rect x="276" y="330" width="150" height="42" rx="21" fill="${ctx.accent}"/>`,
        text("Commencer", {
          x: 351,
          y: 357,
          size: 14,
          fill: readableOn(ctx.accent),
          font: ctx.bodyFont,
          weight: 600,
          anchor: "middle",
        }),
        // Content cards
        ...[0, 1, 2].map((i) => {
          const y = 470 + i * 150;
          return [
            `<rect x="276" y="${y}" width="348" height="128" rx="18" fill="${mix(ctx.paper, ctx.mist, 0.35)}"/>`,
            `<rect x="296" y="${y + 22}" width="84" height="84" rx="14" fill="${withAlpha(i === 1 ? ctx.accent : ctx.primary, 0.85)}"/>`,
            mark(ctx, 316, y + 42, 44, ctx.paper, ctx.paper),
            `<rect x="400" y="${y + 34}" width="${170 - i * 24}" height="12" rx="6" fill="${withAlpha(ctx.ink, 0.62)}"/>`,
            `<rect x="400" y="${y + 58}" width="${196 - i * 16}" height="9" rx="4.5" fill="${withAlpha(ctx.ink, 0.22)}"/>`,
            `<rect x="400" y="${y + 76}" width="${140 + i * 12}" height="9" rx="4.5" fill="${withAlpha(ctx.ink, 0.22)}"/>`,
          ].join("");
        }),
        // Tab bar
        `<rect x="244" y="900" width="412" height="76" fill="${ctx.paper}"/>`,
        `<rect x="244" y="900" width="412" height="1" fill="${withAlpha(ctx.ink, 0.12)}"/>`,
        ...[0, 1, 2, 3].map((i) => {
          const cx = 296 + i * 104;
          const active = i === 0;
          return `<rect x="${cx - 14}" y="924" width="28" height="28" rx="9" fill="${withAlpha(active ? ctx.primary : ctx.ink, active ? 1 : 0.22)}"/>`;
        }),
        `</g>`,
      ].join(""),
      `${ctx.brandName} mobile app screen`,
    ),
};

const laptopSite: SceneTemplate = {
  id: "laptop-website",
  title: "Site web",
  category: "digital",
  family: "digital-screen",
  width: 1400,
  height: 900,
  render: (ctx) =>
    svg(
      1400,
      900,
      [
        defs(
          softShadow("laptopShadow", 26, 28, 0.28),
          linearGradient("floorGrad", withAlpha(ctx.primary, 0.1), withAlpha(ctx.ink, 0.04), 170),
          linearGradient("siteHero", ctx.secondary, darken(ctx.primary, 0.12), 130),
        ),
        studioFloor(ctx, 1400, 900, 0.66),
        `<g filter="url(#laptopShadow)">`,
        `<rect x="200" y="90" width="1000" height="630" rx="18" fill="${darken(ctx.ink, 0.32)}"/>`,
        `<rect x="220" y="110" width="960" height="580" rx="6" fill="${ctx.paper}"/>`,
        `<path d="M120 720 h1160 l40 56 q6 12 -8 12 H88 q-14 0 -8 -12 z" fill="${mix(ctx.mist, ctx.ink, 0.12)}"/>`,
        `<rect x="600" y="726" width="200" height="10" rx="5" fill="${withAlpha(ctx.ink, 0.2)}"/>`,
        `</g>`,
        `<clipPath id="siteClip"><rect x="220" y="110" width="960" height="580" rx="6"/></clipPath>`,
        `<g clip-path="url(#siteClip)">`,
        // Nav
        `<rect x="220" y="110" width="960" height="70" fill="${ctx.paper}"/>`,
        mark(ctx, 252, 126, 38, ctx.primary, ctx.accent),
        text(ctx.brandName, {
          x: 300,
          y: 152,
          size: 20,
          fill: ctx.ink,
          font: ctx.displayFont,
          weight: 700,
        }),
        ...[0, 1, 2].map(
          (i) =>
            `<rect x="${760 + i * 90}" y="139" width="${64 - i * 6}" height="9" rx="4.5" fill="${withAlpha(ctx.ink, 0.3)}"/>`,
        ),
        `<rect x="1050" y="128" width="102" height="34" rx="17" fill="${ctx.primary}"/>`,
        // Hero
        `<rect x="220" y="180" width="960" height="340" fill="url(#siteHero)"/>`,
        text(ctx.brandName, {
          x: 700,
          y: 322,
          size: 62,
          fill: ctx.paper,
          font: ctx.displayFont,
          weight: 700,
          anchor: "middle",
          letterSpacing: -1.5,
        }),
        text(ctx.tagline, {
          x: 700,
          y: 366,
          size: 20,
          fill: withAlpha(ctx.paper, 0.8),
          font: ctx.bodyFont,
          weight: 400,
          anchor: "middle",
        }),
        `<rect x="618" y="400" width="164" height="48" rx="24" fill="${ctx.accent}"/>`,
        text("Découvrir", {
          x: 700,
          y: 430,
          size: 16,
          fill: readableOn(ctx.accent),
          font: ctx.bodyFont,
          weight: 600,
          anchor: "middle",
        }),
        // Feature row
        ...[0, 1, 2].map((i) => {
          const x = 268 + i * 300;
          return [
            `<rect x="${x}" y="560" width="264" height="150" rx="14" fill="${mix(ctx.paper, ctx.mist, 0.3)}"/>`,
            `<rect x="${x + 24}" y="584" width="40" height="40" rx="12" fill="${i === 1 ? ctx.accent : ctx.primary}"/>`,
            `<rect x="${x + 24}" y="644" width="${172 - i * 20}" height="11" rx="5.5" fill="${withAlpha(ctx.ink, 0.55)}"/>`,
            `<rect x="${x + 24}" y="666" width="${210 - i * 14}" height="8" rx="4" fill="${withAlpha(ctx.ink, 0.2)}"/>`,
          ].join("");
        }),
        `</g>`,
      ].join(""),
      `${ctx.brandName} website on laptop`,
    ),
};

const socialGrid: SceneTemplate = {
  id: "social-grid",
  title: "Publications réseaux sociaux",
  category: "digital",
  family: "digital-screen",
  width: 1100,
  height: 1100,
  render: (ctx) => {
    const tiles = [
      { bg: ctx.primary, kind: "mark" },
      { bg: ctx.paper, kind: "type" },
      { bg: ctx.accent, kind: "quote" },
      { bg: ctx.secondary, kind: "type" },
      { bg: ctx.paper, kind: "mark" },
      { bg: darken(ctx.primary, 0.24), kind: "quote" },
      { bg: ctx.accent, kind: "mark" },
      { bg: ctx.secondary, kind: "quote" },
      { bg: ctx.paper, kind: "type" },
    ];
    const size = 320;
    const gap = 16;
    const offset = 50;

    return svg(
      1100,
      1100,
      [
        defs(
          linearGradient("floorGrad", withAlpha(ctx.mist, 0.5), withAlpha(ctx.paper, 0.9), 180),
        ),
        studioFloor(ctx, 1100, 1100, 0.95),
        ...tiles.map((tile, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = offset + col * (size + gap);
          const y = offset + row * (size + gap);
          const fg = readableOn(tile.bg);
          const body: string[] = [
            `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="10" fill="${tile.bg}"/>`,
          ];
          if (tile.kind === "mark") {
            body.push(mark(ctx, x + size / 2 - 60, y + size / 2 - 70, 120, fg, withAlpha(fg, 0.55)));
            body.push(
              text(ctx.brandName, {
                x: x + size / 2,
                y: y + size - 62,
                size: 20,
                fill: fg,
                font: ctx.displayFont,
                weight: 700,
                anchor: "middle",
              }),
            );
          } else if (tile.kind === "type") {
            body.push(
              text(ctx.brandName.toUpperCase(), {
                x: x + 28,
                y: y + 76,
                size: 15,
                fill: withAlpha(fg, 0.6),
                font: ctx.bodyFont,
                weight: 600,
                letterSpacing: 4,
              }),
            );
            body.push(
              text(ctx.tagline.split(" ").slice(0, 3).join(" "), {
                x: x + 28,
                y: y + 168,
                size: 40,
                fill: fg,
                font: ctx.displayFont,
                weight: 700,
                letterSpacing: -1,
              }),
            );
            body.push(
              `<rect x="${x + 28}" y="${y + 200}" width="72" height="4" rx="2" fill="${ctx.accent}"/>`,
            );
          } else {
            body.push(
              text("“", {
                x: x + 28,
                y: y + 110,
                size: 96,
                fill: withAlpha(fg, 0.35),
                font: ctx.displayFont,
                weight: 700,
              }),
            );
            body.push(
              `<rect x="${x + 28}" y="${y + 130}" width="${size - 90}" height="10" rx="5" fill="${withAlpha(fg, 0.45)}"/>`,
            );
            body.push(
              `<rect x="${x + 28}" y="${y + 154}" width="${size - 130}" height="10" rx="5" fill="${withAlpha(fg, 0.45)}"/>`,
            );
            body.push(mark(ctx, x + 28, y + size - 90, 44, fg, withAlpha(fg, 0.6)));
          }
          return body.join("");
        }),
      ].join(""),
      `${ctx.brandName} social media grid`,
    );
  },
};

/* -------------------------------------------------------------------------- */
/*  Family: signage                                                           */
/* -------------------------------------------------------------------------- */

const storefront: SceneTemplate = {
  id: "storefront",
  title: "Devanture",
  category: "environmental",
  family: "signage",
  width: 1400,
  height: 950,
  render: (ctx) =>
    svg(
      1400,
      950,
      [
        defs(
          softShadow("frontShadow", 12, 20, 0.2),
          linearGradient("floorGrad", withAlpha(ctx.ink, 0.06), withAlpha(ctx.ink, 0.02), 180),
          linearGradient("skyGrad", lighten(ctx.mist, 0.4), mix(ctx.mist, ctx.paper, 0.4), 180),
          linearGradient("glassGrad", withAlpha(ctx.secondary, 0.55), withAlpha(ctx.ink, 0.75), 150),
        ),
        `<rect width="1400" height="950" fill="url(#skyGrad)"/>`,
        `<rect y="820" width="1400" height="130" fill="${mix(ctx.mist, ctx.ink, 0.22)}"/>`,
        // Facade
        `<rect x="140" y="120" width="1120" height="700" fill="${mix(ctx.paper, ctx.mist, 0.55)}"/>`,
        `<rect x="140" y="120" width="1120" height="700" fill="none" stroke="${withAlpha(ctx.ink, 0.08)}" stroke-width="2"/>`,
        // Sign band
        `<rect x="140" y="150" width="1120" height="170" fill="${ctx.secondary}" filter="url(#frontShadow)"/>`,
        mark(ctx, 300, 178, 112, ctx.paper, lighten(ctx.accent, 0.35)),
        text(ctx.brandName, {
          x: 448,
          y: 254,
          size: 74,
          fill: ctx.paper,
          font: ctx.displayFont,
          weight: 700,
          letterSpacing: -1,
        }),
        // Awning
        `<path d="M170 340 h1060 l-40 90 h-980 z" fill="${ctx.primary}"/>`,
        ...Array.from({ length: 9 }, (_, i) =>
          i % 2 === 0
            ? `<path d="M${170 + i * 118} 340 h118 l-13 90 h-118 z" fill="${withAlpha(ctx.paper, 0.22)}"/>`
            : "",
        ),
        // Windows
        `<rect x="200" y="470" width="440" height="350" fill="url(#glassGrad)"/>`,
        `<rect x="760" y="470" width="440" height="350" fill="url(#glassGrad)"/>`,
        `<path d="M200 470 L340 470 L200 640 Z" fill="${withAlpha("#FFFFFF", 0.14)}"/>`,
        `<path d="M760 470 L900 470 L760 640 Z" fill="${withAlpha("#FFFFFF", 0.14)}"/>`,
        // Window decal
        mark(ctx, 372, 560, 96, withAlpha(ctx.paper, 0.9), withAlpha(ctx.accent, 0.9)),
        text(ctx.tagline, {
          x: 980,
          y: 660,
          size: 22,
          fill: withAlpha(ctx.paper, 0.86),
          font: ctx.bodyFont,
          weight: 400,
          anchor: "middle",
        }),
        // Door
        `<rect x="660" y="500" width="90" height="320" rx="4" fill="${darken(ctx.secondary, 0.25)}"/>`,
        `<circle cx="668" cy="660" r="6" fill="${ctx.accent}"/>`,
      ].join(""),
      `${ctx.brandName} storefront signage`,
    ),
};

const wallSign: SceneTemplate = {
  id: "reception-wall",
  title: "Mur d’accueil",
  category: "environmental",
  family: "signage",
  width: 1300,
  height: 850,
  render: (ctx) =>
    svg(
      1300,
      850,
      [
        defs(
          `<filter id="signRelief" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="6" dy="10" stdDeviation="8" flood-color="#000" flood-opacity="0.32"/></filter>`,
          linearGradient("floorGrad", withAlpha(ctx.ink, 0.04), withAlpha(ctx.ink, 0.1), 180),
          linearGradient("wallGrad", mix(ctx.paper, ctx.mist, 0.3), mix(ctx.mist, ctx.ink, 0.14), 165),
        ),
        `<rect width="1300" height="850" fill="url(#wallGrad)"/>`,
        // Floor plane
        `<path d="M0 700 L1300 640 L1300 850 L0 850 Z" fill="${mix(ctx.mist, ctx.ink, 0.3)}"/>`,
        `<path d="M0 700 L1300 640 L1300 668 L0 726 Z" fill="${withAlpha(ctx.ink, 0.16)}"/>`,
        // Light pool
        `<ellipse cx="650" cy="330" rx="520" ry="330" fill="${withAlpha("#FFFFFF", 0.28)}"/>`,
        // Dimensional letters
        `<g filter="url(#signRelief)">`,
        mark(ctx, 300, 200, 150, ctx.primary, ctx.accent),
        text(ctx.brandName, {
          x: 490,
          y: 320,
          size: 88,
          fill: darken(ctx.ink, 0.05),
          font: ctx.displayFont,
          weight: 700,
          letterSpacing: -2,
        }),
        `</g>`,
        text(ctx.tagline.toUpperCase(), {
          x: 492,
          y: 372,
          size: 19,
          fill: withAlpha(ctx.ink, 0.5),
          font: ctx.bodyFont,
          weight: 600,
          letterSpacing: 6,
        }),
        // Bench + plant for scale
        `<rect x="220" y="596" width="380" height="26" rx="10" fill="${darken(ctx.secondary, 0.1)}"/>`,
        `<rect x="250" y="622" width="18" height="78" fill="${darken(ctx.secondary, 0.28)}"/>`,
        `<rect x="552" y="622" width="18" height="78" fill="${darken(ctx.secondary, 0.28)}"/>`,
        `<path d="M980 700 q-16 -110 20 -170 q36 60 20 170 z" fill="${mix(ctx.primary, ctx.ink, 0.4)}"/>`,
        `<rect x="962" y="700" width="76" height="60" rx="8" fill="${ctx.accent}"/>`,
      ].join(""),
      `${ctx.brandName} reception wall signage`,
    ),
};

const billboard: SceneTemplate = {
  id: "billboard",
  title: "Panneau publicitaire",
  category: "environmental",
  family: "signage",
  width: 1400,
  height: 950,
  render: (ctx) =>
    svg(
      1400,
      950,
      [
        defs(
          softShadow("boardShadow", 18, 24, 0.3),
          linearGradient("floorGrad", withAlpha(ctx.ink, 0.05), withAlpha(ctx.ink, 0.02), 180),
          linearGradient("duskGrad", mix(ctx.secondary, ctx.paper, 0.72), mix(ctx.accent, ctx.paper, 0.82), 180),
          linearGradient("boardGrad", ctx.primary, darken(ctx.secondary, 0.05), 145),
        ),
        `<rect width="1400" height="950" fill="url(#duskGrad)"/>`,
        // Skyline
        ...[
          [40, 620, 150, 330],
          [210, 690, 110, 260],
          [1080, 660, 130, 290],
          [1230, 600, 140, 350],
        ].map(
          ([x, y, w, h]) =>
            `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${withAlpha(ctx.ink, 0.18)}"/>`,
        ),
        `<rect y="880" width="1400" height="70" fill="${mix(ctx.ink, ctx.secondary, 0.5)}"/>`,
        // Posts
        `<rect x="386" y="560" width="34" height="330" fill="${mix(ctx.ink, ctx.mist, 0.28)}"/>`,
        `<rect x="984" y="560" width="34" height="330" fill="${mix(ctx.ink, ctx.mist, 0.28)}"/>`,
        // Board
        `<g filter="url(#boardShadow)">`,
        `<rect x="300" y="150" width="800" height="440" rx="6" fill="${mix(ctx.ink, ctx.mist, 0.2)}"/>`,
        `<rect x="316" y="166" width="768" height="408" fill="url(#boardGrad)"/>`,
        `</g>`,
        mark(ctx, 370, 232, 130, ctx.paper, lighten(ctx.accent, 0.35)),
        text(ctx.brandName, {
          x: 540,
          y: 336,
          size: 78,
          fill: ctx.paper,
          font: ctx.displayFont,
          weight: 700,
          letterSpacing: -2,
        }),
        text(ctx.tagline, {
          x: 542,
          y: 392,
          size: 26,
          fill: withAlpha(ctx.paper, 0.8),
          font: ctx.bodyFont,
          weight: 400,
        }),
        `<rect x="542" y="428" width="120" height="5" rx="2.5" fill="${ctx.accent}"/>`,
        text(`${slug(ctx.brandName)}.com`, {
          x: 1052,
          y: 540,
          size: 20,
          fill: withAlpha(ctx.paper, 0.7),
          font: ctx.bodyFont,
          weight: 500,
          anchor: "end",
        }),
        // Spot lights
        ...[420, 700, 980].map(
          (x) =>
            `<path d="M${x} 620 L${x - 40} 590 L${x + 40} 590 Z" fill="${withAlpha("#FFFFFF", 0.2)}"/>`,
        ),
      ].join(""),
      `${ctx.brandName} billboard`,
    ),
};

/* -------------------------------------------------------------------------- */
/*  Family: lifestyle                                                         */
/* -------------------------------------------------------------------------- */

const toteBag: SceneTemplate = {
  id: "tote-bag",
  title: "Tote bag",
  category: "apparel",
  family: "lifestyle",
  width: 900,
  height: 1100,
  render: (ctx) =>
    svg(
      900,
      1100,
      [
        defs(
          softShadow("toteShadow", 20, 24, 0.24),
          linearGradient("floorGrad", withAlpha(ctx.accent, 0.1), withAlpha(ctx.ink, 0.04), 200),
          linearGradient("canvas", mix(ctx.paper, ctx.mist, 0.28), mix(ctx.mist, ctx.ink, 0.1), 120),
        ),
        studioFloor(ctx, 900, 1100, 0.7),
        // Hook
        `<rect x="436" y="60" width="28" height="70" rx="14" fill="${mix(ctx.ink, ctx.mist, 0.4)}"/>`,
        `<g filter="url(#toteShadow)">`,
        // Handles
        `<path d="M330 300 q0 -190 120 -190 q120 0 120 190" fill="none" stroke="${mix(ctx.paper, ctx.mist, 0.2)}" stroke-width="26" stroke-linecap="round"/>`,
        // Body
        `<path d="M240 290 h420 l34 660 q3 40 -38 40 h-412 q-41 0 -38 -40 z" fill="url(#canvas)"/>`,
        `</g>`,
        // Fold shading
        `<path d="M240 290 h60 l18 700 h-56 q-41 0 -38 -40 z" fill="${withAlpha(ctx.ink, 0.05)}"/>`,
        `<path d="M600 290 h60 l34 660 q3 40 -38 40 h-40 z" fill="${withAlpha(ctx.ink, 0.05)}"/>`,
        // Print
        mark(ctx, 388, 430, 124, ctx.primary, ctx.accent),
        text(ctx.brandName, {
          x: 450,
          y: 660,
          size: 46,
          fill: ctx.ink,
          font: ctx.displayFont,
          weight: 700,
          anchor: "middle",
          letterSpacing: -1,
        }),
        `<rect x="386" y="692" width="128" height="4" rx="2" fill="${ctx.accent}"/>`,
        text(ctx.tagline.toUpperCase(), {
          x: 450,
          y: 740,
          size: 14,
          fill: withAlpha(ctx.ink, 0.55),
          font: ctx.bodyFont,
          weight: 600,
          anchor: "middle",
          letterSpacing: 4,
        }),
      ].join(""),
      `${ctx.brandName} tote bag`,
    ),
};

const tshirt: SceneTemplate = {
  id: "tshirt",
  title: "Tenues d’équipe",
  category: "apparel",
  family: "lifestyle",
  width: 1100,
  height: 950,
  render: (ctx) => {
    const shirt = isDark(ctx.primary) ? ctx.primary : darken(ctx.secondary, 0.1);
    const print = readableOn(shirt);
    return svg(
      1100,
      950,
      [
        defs(
          softShadow("teeShadow", 18, 22, 0.24),
          linearGradient("floorGrad", withAlpha(ctx.mist, 0.4), withAlpha(ctx.paper, 0.9), 190),
          linearGradient("fabric", lighten(shirt, 0.08), darken(shirt, 0.12), 130),
        ),
        studioFloor(ctx, 1100, 950, 0.92),
        `<g filter="url(#teeShadow)">`,
        `<path d="M370 190 L470 150 q80 60 160 0 l100 40 l130 90 -70 110 -60 -42 v420 q0 26 -26 26 H396 q-26 0 -26 -26 V388 l-60 42 -70 -110 z" fill="url(#fabric)"/>`,
        `<path d="M470 150 q80 60 160 0 q-60 74 -160 0z" fill="${darken(shirt, 0.2)}"/>`,
        `</g>`,
        // Chest print
        mark(ctx, 500, 300, 100, print, ctx.accent),
        text(ctx.brandName, {
          x: 550,
          y: 470,
          size: 34,
          fill: print,
          font: ctx.displayFont,
          weight: 700,
          anchor: "middle",
          letterSpacing: -0.5,
        }),
        `<rect x="506" y="494" width="88" height="3" rx="1.5" fill="${ctx.accent}"/>`,
        // Folded cap beside it
        `<g transform="translate(830, 620)" filter="url(#teeShadow)">`,
        `<path d="M0 120 q0 -110 110 -110 q110 0 110 110 z" fill="${ctx.primary}"/>`,
        `<path d="M0 120 h220 q34 0 34 22 h-288 q0 -22 34 -22z" fill="${darken(ctx.primary, 0.2)}"/>`,
        mark(ctx, 82, 40, 58, readableOn(ctx.primary), ctx.accent),
        `</g>`,
      ].join(""),
      `${ctx.brandName} apparel`,
    );
  },
};

const deskScene: SceneTemplate = {
  id: "desk-scene",
  title: "En situation",
  category: "print",
  family: "lifestyle",
  width: 1300,
  height: 900,
  render: (ctx) =>
    svg(
      1300,
      900,
      [
        defs(
          softShadow("deskShadow", 14, 18, 0.2),
          linearGradient("floorGrad", withAlpha(ctx.secondary, 0.1), withAlpha(ctx.ink, 0.05), 155),
          linearGradient("woodGrad", mix(ctx.secondary, ctx.mist, 0.5), mix(ctx.secondary, ctx.ink, 0.35), 160),
        ),
        `<rect width="1300" height="900" fill="url(#woodGrad)"/>`,
        ...Array.from(
          { length: 7 },
          (_, i) =>
            `<rect y="${i * 130}" width="1300" height="2" fill="${withAlpha(ctx.ink, 0.06)}"/>`,
        ),
        // Notebook
        `<g transform="rotate(-6 420 470)" filter="url(#deskShadow)">`,
        `<rect x="180" y="220" width="480" height="600" rx="14" fill="${ctx.primary}"/>`,
        `<rect x="180" y="220" width="26" height="600" rx="13" fill="${darken(ctx.primary, 0.22)}"/>`,
        mark(ctx, 380, 420, 90, ctx.paper, lighten(ctx.accent, 0.35)),
        text(ctx.brandName, {
          x: 424,
          y: 590,
          size: 30,
          fill: ctx.paper,
          font: ctx.displayFont,
          weight: 700,
          anchor: "middle",
        }),
        `</g>`,
        // Loose card
        `<g transform="rotate(9 880 640)" filter="url(#deskShadow)">`,
        `<rect x="700" y="560" width="420" height="250" rx="8" fill="${ctx.paper}"/>`,
        mark(ctx, 732, 592, 48, ctx.primary, ctx.accent),
        text(ctx.brandName, {
          x: 732,
          y: 700,
          size: 24,
          fill: ctx.ink,
          font: ctx.displayFont,
          weight: 700,
        }),
        text(ctx.tagline, {
          x: 732,
          y: 726,
          size: 13,
          fill: withAlpha(ctx.ink, 0.6),
          font: ctx.bodyFont,
          weight: 400,
        }),
        `</g>`,
        // Enamel pin
        `<circle cx="880" cy="330" r="86" fill="${ctx.accent}" filter="url(#deskShadow)"/>`,
        `<circle cx="880" cy="330" r="86" fill="none" stroke="${withAlpha("#FFFFFF", 0.35)}" stroke-width="4"/>`,
        mark(ctx, 834, 284, 92, readableOn(ctx.accent), readableOn(ctx.accent)),
        // Pen
        `<g transform="rotate(28 1150 500)">`,
        `<rect x="1120" y="300" width="22" height="380" rx="11" fill="${darken(ctx.ink, 0.1)}"/>`,
        `<path d="M1120 680 h22 l-11 40 z" fill="${ctx.accent}"/>`,
        `</g>`,
      ].join(""),
      `${ctx.brandName} brand items in context`,
    ),
};

/* -------------------------------------------------------------------------- */
/*  Catalogue and selection                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Photographic scenes, adapted to the same template shape as the vector ones.
 *
 * They sit in one catalogue so the variety rule applies across both kinds — a
 * photographed cup and a drawn app screen are just two scenes from different
 * families as far as the selector is concerned.
 */
const PHOTO_TEMPLATES: SceneTemplate[] = PHOTO_SCENES.map((scene) => ({
  id: scene.id,
  title: scene.title,
  category: scene.category,
  family: scene.family,
  width: scene.width,
  height: scene.height,
  render: (ctx) => renderPhotoScene(scene, ctx),
}));

/**
 * Vector scenes stay for two reasons: they are the fallback when a backplate
 * is missing, and for digital surfaces a drawn interface beats a photograph of
 * a screen — it shows the brand's actual palette and type in a real layout
 * rather than a blurred rectangle.
 */
const VECTOR_SCENES: SceneTemplate[] = [
  businessCards,
  stationerySet,
  cardStack,
  packagingBox,
  pouchPack,
  bottleLabel,
  takeawayCup,
  phoneApp,
  laptopSite,
  socialGrid,
  storefront,
  wallSign,
  billboard,
  toteBag,
  tshirt,
  deskScene,
];

const SCENES: SceneTemplate[] = [...PHOTO_TEMPLATES, ...VECTOR_SCENES];

/**
 * Scene priority per detected sector. Scenes not listed stay eligible but sort
 * last, so a café leads with cups and a storefront while a SaaS leads with an
 * app screen — without ever producing a set that is all one family.
 */
const SECTOR_PRIORITY: Record<string, string[]> = {
  food: [
    "photo-cup", "photo-storefront", "photo-pouch", "photo-business-cards",
    "photo-tote", "social-grid", "photo-desk", "photo-reception",
  ],
  tech: [
    "phone-app", "photo-business-cards", "laptop-website", "photo-reception",
    "photo-box", "social-grid", "photo-storefront", "photo-stationery",
  ],
  luxury: [
    "photo-box", "photo-bottle", "photo-business-cards", "photo-billboard",
    "photo-stationery", "social-grid", "photo-tote", "photo-reception",
  ],
  health: [
    "photo-reception", "photo-stationery", "photo-storefront", "phone-app",
    "photo-business-cards", "photo-tote", "photo-bottle", "social-grid",
  ],
  creative: [
    "photo-desk", "social-grid", "photo-billboard", "photo-business-cards",
    "photo-tote", "laptop-website", "photo-stationery", "photo-cup",
  ],
  default: [
    "photo-business-cards", "phone-app", "photo-storefront", "photo-box",
    "photo-tote", "social-grid", "photo-billboard", "photo-stationery",
  ],
};

/**
 * Enforces the variety rule: no scene repeats, and no two consecutive mockups
 * share a composition family.
 */
export function selectScenes(
  sector: string,
  count: number,
  direction?: ArtDirection,
): SceneTemplate[] {
  const priority = SECTOR_PRIORITY[sector] ?? SECTOR_PRIORITY.default;
  const rank = new Map(priority.map((id, i) => [id, i]));

  /*
   * The art direction reorders the catalogue before the variety rule runs.
   *
   * A surface can be right for the sector and wrong for the direction — a
   * canvas tote suits an artisanal coffee brand and undercuts a dark-premium
   * one. Applying the profile's preferences first means the variety rule then
   * picks among surfaces that already fit the brand.
   */
  const score = (scene: SceneTemplate): number => {
    const base = rank.get(scene.id) ?? 99;
    if (!direction) return base;
    if (direction.mockup.avoid.includes(scene.id)) return base + 100;
    if (direction.mockup.prefer.includes(scene.id)) return base - 50;
    return base;
  };

  const pool = [...SCENES].sort((a, b) => score(a) - score(b));

  const chosen: SceneTemplate[] = [];
  let lastFamily: MockupFamily | null = null;

  while (chosen.length < count && chosen.length < pool.length) {
    // Prefer the highest-priority unused scene from a different family.
    const next =
      pool.find((s) => !chosen.includes(s) && s.family !== lastFamily) ??
      pool.find((s) => !chosen.includes(s));

    if (!next) break;
    chosen.push(next);
    lastFamily = next.family;
  }

  return chosen;
}

export function buildSceneContext(
  brandName: string,
  tagline: string,
  markup: string,
  palette: ColorSwatch[],
  typography: TypeStyle[],
): SceneContext {
  const primary = primaryColor(palette).hex;
  const secondary =
    palette.find((s) => s.role === "secondary")?.hex ?? darken(primary, 0.3);
  const accent = palette.find((s) => s.role === "accent")?.hex ?? primary;
  const neutrals = palette.filter((s) => s.role === "neutral");
  const paper =
    neutrals.find((s) => !isDark(s.hex))?.hex ?? "#FAFAF8";
  const ink = neutrals.find((s) => isDark(s.hex))?.hex ?? "#151515";
  const mist =
    neutrals.find((s) => s.hex !== paper && !isDark(s.hex))?.hex ??
    mix(paper, ink, 0.12);

  const display = typography.find((t) => t.role === "display") ?? typography[0];
  const body = typography.find((t) => t.role === "body") ?? typography[0];

  return {
    brandName,
    tagline,
    markup,
    primary,
    secondary,
    accent,
    paper,
    mist,
    ink,
    displayFont: display.stack,
    bodyFont: body.stack,
  };
}

export function generateMockups(
  ctx: SceneContext,
  sector: string,
  count = 8,
  direction?: ArtDirection,
): Mockup[] {
  return selectScenes(sector, count, direction).map((scene) => ({
    id: scene.id,
    title: scene.title,
    category: scene.category,
    family: scene.family,
    scene: scene.id,
    svg: scene.render(ctx),
  }));
}

/** Re-renders one mockup, used by the "regenerate this section" action. */
export function renderScene(sceneId: string, ctx: SceneContext): Mockup | null {
  const scene = SCENES.find((s) => s.id === sceneId);
  if (!scene) return null;
  return {
    id: scene.id,
    title: scene.title,
    category: scene.category,
    family: scene.family,
    scene: scene.id,
    svg: scene.render(ctx),
  };
}

export const MOCKUP_CATEGORIES: MockupCategory[] = [
  "print",
  "digital",
  "packaging",
  "environmental",
  "apparel",
];

export const CATEGORY_LABELS: Record<MockupCategory, string> = {
  print: "Impression",
  digital: "Numérique",
  packaging: "Emballage",
  environmental: "Signalétique",
  apparel: "Textile",
};

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24) || "brand"
  );
}
