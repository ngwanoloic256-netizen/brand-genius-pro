import { readableOn, withAlpha } from "../color";
import { paintMark } from "./mark-tokens";
import { advanceWidth } from "./text-metrics";
import type { MockupCategory, MockupFamily } from "../types";
import type { SceneContext } from "./mockups";

/**
 * Photographic mockup scenes.
 *
 * Each backplate is a photograph of a real, deliberately *unbranded* surface —
 * a blank card, an empty sign panel, a plain kraft sleeve. The brand is applied
 * at render time by mapping the vector lockup onto a placement quad measured
 * from the photograph.
 *
 * This is the split that matters: the photograph supplies realism, the vector
 * supplies exact brand fidelity. An image model asked to "put this logo on a
 * cup" would approximate both the mark and its colours; here the mark is the
 * customer's actual artwork at their actual hex values, and only the lighting
 * comes from the photo.
 *
 * Backplates are generated once (see `scripts/optimize-mockups.mjs`) and ship
 * as static assets, so producing a mockup at runtime costs no API call.
 */

/**
 * Where the artwork sits on the photograph, in fractions of the image.
 *
 * `o` is the top-left corner of the artwork, `u` the vector along its width
 * and `v` the vector down its height. Expressing it as two edge vectors rather
 * than a rectangle is what lets artwork lie on a surface that is rotated or
 * seen at an angle — the business cards, the angled box face — instead of only
 * on flat, straight-on surfaces.
 */
export interface PlacementQuad {
  ox: number;
  oy: number;
  ux: number;
  uy: number;
  vx: number;
  vy: number;
}

/** Straight, axis-aligned placement — the common case. */
function rect(x: number, y: number, w: number, h: number): PlacementQuad {
  return { ox: x, oy: y, ux: w, uy: 0, vx: 0, vy: h };
}

export interface PhotoScene {
  id: string;
  title: string;
  category: MockupCategory;
  family: MockupFamily;
  /** File in `public/mockups/`. */
  file: string;
  width: number;
  height: number;
  /** Whether the surface under the artwork is light or dark. */
  surface: "light" | "dark";
  placement: PlacementQuad;
  /** `lockup` draws mark + brand name; `mark` draws the icon alone. */
  artwork: "lockup" | "mark";
  /** Slight transparency lets the surface texture read through the ink. */
  inkOpacity?: number;
}

export const PHOTO_SCENES: PhotoScene[] = [
  {
    id: "photo-business-cards",
    title: "Cartes de visite",
    category: "print",
    family: "flat-lay",
    file: "cards.jpg",
    width: 1600,
    height: 1179,
    surface: "light",
    // The upper card is rotated; measured from its corners in the photograph.
    placement: {
      ox: 0.352,
      oy: 0.416,
      ux: 0.272,
      uy: -0.175,
      vx: 0.05,
      vy: 0.106,
    },
    artwork: "lockup",
    inkOpacity: 0.92,
  },
  {
    id: "photo-storefront",
    title: "Enseigne de boutique",
    category: "environmental",
    family: "signage",
    file: "storefront.jpg",
    width: 1600,
    height: 914,
    surface: "light",
    placement: rect(0.28, 0.095, 0.44, 0.125),
    artwork: "lockup",
    inkOpacity: 0.95,
  },
  {
    id: "photo-cup",
    title: "Gobelet à emporter",
    category: "packaging",
    family: "product-closeup",
    file: "cup.jpg",
    width: 1600,
    height: 2171,
    surface: "light",
    placement: rect(0.27, 0.478, 0.46, 0.115),
    artwork: "lockup",
    inkOpacity: 0.88,
  },
  {
    id: "photo-pouch",
    title: "Sachet doypack",
    category: "packaging",
    family: "product-closeup",
    file: "pouch.jpg",
    width: 1600,
    height: 2171,
    surface: "light",
    placement: rect(0.27, 0.4, 0.46, 0.14),
    artwork: "lockup",
    inkOpacity: 0.9,
  },
  {
    id: "photo-box",
    title: "Boîte produit",
    category: "packaging",
    family: "product-closeup",
    file: "box.jpg",
    width: 1600,
    height: 1600,
    surface: "light",
    placement: rect(0.28, 0.43, 0.4, 0.12),
    artwork: "lockup",
    inkOpacity: 0.92,
  },
  {
    id: "photo-bottle",
    title: "Étiquette de bouteille",
    category: "packaging",
    family: "product-closeup",
    file: "bottle.jpg",
    width: 1600,
    height: 2171,
    surface: "light",
    placement: rect(0.3, 0.48, 0.4, 0.1),
    artwork: "lockup",
    inkOpacity: 0.92,
  },
  {
    id: "photo-tote",
    title: "Tote bag",
    category: "apparel",
    family: "lifestyle",
    file: "tote.jpg",
    width: 1600,
    height: 2171,
    surface: "light",
    placement: rect(0.28, 0.44, 0.44, 0.13),
    artwork: "lockup",
    inkOpacity: 0.85,
  },
  {
    id: "photo-reception",
    title: "Mur d’accueil",
    category: "environmental",
    family: "signage",
    file: "reception.jpg",
    width: 1600,
    height: 914,
    surface: "light",
    placement: rect(0.3, 0.33, 0.4, 0.15),
    artwork: "lockup",
    inkOpacity: 0.95,
  },
  {
    id: "photo-billboard",
    title: "Panneau publicitaire",
    category: "environmental",
    family: "signage",
    file: "billboard.jpg",
    width: 1600,
    height: 914,
    surface: "light",
    placement: rect(0.27, 0.35, 0.46, 0.16),
    artwork: "lockup",
    inkOpacity: 0.95,
  },
  {
    id: "photo-stationery",
    title: "Papier à en-tête",
    category: "print",
    family: "flat-lay",
    file: "stationery.jpg",
    width: 1600,
    height: 2171,
    surface: "light",
    placement: rect(0.28, 0.155, 0.36, 0.085),
    artwork: "lockup",
    inkOpacity: 0.92,
  },
  {
    id: "photo-desk",
    title: "Carnet",
    category: "print",
    family: "lifestyle",
    file: "desk.jpg",
    width: 1600,
    height: 1179,
    surface: "dark",
    placement: rect(0.26, 0.43, 0.38, 0.12),
    artwork: "lockup",
    inkOpacity: 0.9,
  },
];

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

/**
 * A horizontal lockup drawn into its own coordinate box, ready to be nested
 * and fitted into a placement quad.
 */
function lockupBlock(
  ctx: SceneContext,
  markColor: string,
  accentColor: string,
  textColor: string,
  withText: boolean,
): { inner: string; width: number; height: number } {
  let painted = paintMark(ctx.markup, markColor, accentColor);
  // Monogramme de secours peint clair sur fond sombre : ses initiales blanches
  // disparaîtraient dans la forme ; elles prennent la couleur de l'encre.
  if (markColor === ctx.paper) {
    painted = painted.replace(/(<text\b[^>]*\bfill=")(#fff(?:fff)?|white)(")/gi, `$1${ctx.ink}$3`);
  }

  if (!withText) {
    return { inner: painted, width: 100, height: 100 };
  }

  const fontSize = 34;
  const markSize = 64;
  const gap = 18;
  const letterSpacing = -0.5;

  /*
   * Two things keep the lockup centred inside its placement quad.
   *
   * First, the width is estimated per character rather than by a flat factor.
   * The flat factor this replaces over-measured ordinary brand names by 31-59%,
   * and since the surrounding <svg> centres the *declared* box, that phantom
   * gutter on the right pushed the visible artwork left on every mockup.
   *
   * Second, the padding is split evenly on both sides and the content is
   * positioned from the box's own centre. Any residual error in the estimate
   * therefore changes how large the lockup is drawn, never where it sits — the
   * failure mode is a slightly small lockup, still centred, instead of a
   * correctly sized one adrift.
   */
  const textWidth = advanceWidth(
    ctx.brandName,
    fontSize,
    letterSpacing,
    ctx.displayFont,
  );
  const contentWidth = markSize + gap + textWidth;
  const padding = Math.max(8, contentWidth * 0.04);
  const width = Math.round(contentWidth + padding * 2);
  const height = 72;

  const left = (width - contentWidth) / 2;
  const markTop = (height - markSize) / 2;

  return {
    width,
    height,
    inner: [
      `<g transform="translate(${left.toFixed(2)}, ${markTop}) scale(${markSize / 100})">${painted}</g>`,
      `<text x="${(left + markSize + gap).toFixed(2)}" y="${height / 2}" dominant-baseline="central" font-family="${esc(ctx.displayFont)}" font-size="${fontSize}" font-weight="700" letter-spacing="${letterSpacing}" fill="${textColor}">${esc(ctx.brandName)}</text>`,
    ].join(""),
  };
}

/**
 * Fits a `w x h` box into the unit square, centred, without distorting it —
 * the same result `preserveAspectRatio="xMidYMid meet"` gives on a nested
 * <svg>, but expressed as a plain transform on a <g>.
 *
 * The distinction matters. A nested <svg> establishes a viewport, so anything
 * wider than its declared viewBox is clipped, and the wordmark's width can only
 * ever be *estimated* here — no font is loaded on the server. Measured against
 * the real faces, the per-character table can still fall ~9% short on a
 * wide-lettered display face, which on a nested <svg> shears the last letter
 * off the name. Sizing the box generously to avoid that is what used to push
 * the artwork off-centre, so it trades one visible defect for the other.
 *
 * A <g> has no viewport and therefore never clips. That removes the trade
 * entirely: the box can be sized to the honest estimate, an under-estimate
 * simply paints slightly past the edge instead of being cut, and the centring
 * stays true.
 */
function fitTransform(w: number, h: number): string {
  const scale = Math.min(1 / w, 1 / h);
  const tx = (1 - w * scale) / 2;
  const ty = (1 - h * scale) / 2;
  return `translate(${tx.toFixed(5)}, ${ty.toFixed(5)}) scale(${scale.toFixed(6)})`;
}

export function renderPhotoScene(scene: PhotoScene, ctx: SceneContext): string {
  const { width: W, height: H, placement: p } = scene;

  const onDark = scene.surface === "dark";
  const markColor = onDark ? ctx.paper : ctx.primary;
  const accentColor = onDark ? withAlpha(ctx.accent, 1) : ctx.accent;
  const textColor = onDark ? ctx.paper : ctx.ink;

  const lockup = lockupBlock(
    ctx,
    markColor,
    accentColor,
    textColor,
    scene.artwork === "lockup",
  );

  // Unit square -> placement quad, expressed in the outer viewBox's units.
  const matrix = [
    (p.ux * W).toFixed(3),
    (p.uy * H).toFixed(3),
    (p.vx * W).toFixed(3),
    (p.vy * H).toFixed(3),
    (p.ox * W).toFixed(3),
    (p.oy * H).toFixed(3),
  ].join(" ");

  /*
   * Réalisme : la lumière de la photo passe sur l'encre.
   *
   * Une encre posée à plat reste parfaitement uniforme alors que le support
   * autour d'elle a des ombres, un grain, un pli. On redessine donc la photo
   * par-dessus le logo, uniquement à l'intérieur du logo (masque), en mode
   * « produit » sur fond clair (les ombres du support assombrissent l'encre) et
   * en « lumière douce » sur fond sombre (les reflets passent sans ternir le
   * blanc). Un très léger flou imite l'encre qui boit dans la matière.
   *
   * Ces calques portent `data-realism` : l'export PDF, qui ne gère pas les modes
   * de fusion, les retire et garde le logo net.
   */
  const uid = `ps-${scene.id}`;
  const artwork = `<g transform="matrix(${matrix})"><g transform="${fitTransform(lockup.width, lockup.height)}">${lockup.inner}</g></g>`;
  const maskArt = `<g transform="matrix(${matrix})"><g transform="${fitTransform(lockup.width, lockup.height)}" style="filter:brightness(0) invert(1)">${lockup.inner}</g></g>`;
  const blend = onDark ? "soft-light" : "multiply";
  const blendOpacity = onDark ? 0.45 : 0.85;
  const plate = `href="/mockups/${scene.file}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(ctx.brandName)} ${esc(scene.title.toLowerCase())}">`,
    `<defs data-realism="1"><filter id="${uid}-ink" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${(Math.min(W, H) / 1400).toFixed(2)}"/></filter>`,
    `<mask id="${uid}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="black"/>${maskArt}</mask></defs>`,
    `<image ${plate}/>`,
    `<g opacity="${scene.inkOpacity ?? 0.92}" filter="url(#${uid}-ink)">${artwork}</g>`,
    `<image data-realism="1" ${plate} mask="url(#${uid}-mask)" opacity="${blendOpacity}" style="mix-blend-mode:${blend}"/>`,
    `</svg>`,
  ].join("");
}

/** Contrast-safe ink for a surface, used when a backplate is re-tuned. */
export function inkFor(surfaceHex: string): string {
  return readableOn(surfaceHex);
}
