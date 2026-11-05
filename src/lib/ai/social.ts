import { darken, isDark, lighten, mix, readableOn, withAlpha, contrastRatio } from "../color";
import { paintMark } from "./mark-tokens";
import { advanceWidth } from "./text-metrics";
import { buildSceneContext, type SceneContext } from "./mockups";
import { defaultContent } from "./flyer";
import type { BrandGuide } from "../types";

/**
 * Le kit réseaux sociaux : les visuels qu'une marque publie la première semaine.
 *
 * Chaque format respecte les dimensions et les zones de sécurité de la
 * plateforme (là où la photo de profil, les boutons ou l'interface viennent
 * recouvrir l'image), et tout est dérivé de la charte : couleurs, polices,
 * symbole et ton. Rien n'est un modèle générique recoloré : la mise en page
 * suit la direction artistique (coins, rythme, densité).
 *
 * Tout est en SVG pur, calculé dans le navigateur à partir de la charte, donc
 * le texte se modifie et se réexporte instantanément.
 */

export type SocialFormatId =
  | "profil"
  | "post-carre"
  | "post-portrait"
  | "story"
  | "facebook"
  | "linkedin"
  | "youtube";

export interface SocialFormat {
  id: SocialFormatId;
  label: string;
  platform: string;
  width: number;
  height: number;
  /** Où publier ce visuel, en une phrase. */
  usage: string;
}

export const SOCIAL_FORMATS: SocialFormat[] = [
  {
    id: "profil",
    label: "Photo de profil",
    platform: "Tous les réseaux",
    width: 1080,
    height: 1080,
    usage: "Facebook, Instagram, WhatsApp Business, TikTok, LinkedIn : le symbole reste lisible même rogné en rond.",
  },
  {
    id: "post-carre",
    label: "Publication carrée",
    platform: "Instagram · Facebook",
    width: 1080,
    height: 1080,
    usage: "Première publication : votre slogan, en grand.",
  },
  {
    id: "post-portrait",
    label: "Publication portrait",
    platform: "Instagram · Facebook",
    width: 1080,
    height: 1350,
    usage: "Le format qui prend le plus de place dans le fil d’actualité.",
  },
  {
    id: "story",
    label: "Story et statut",
    platform: "Instagram · Facebook · WhatsApp",
    width: 1080,
    height: 1920,
    usage: "Story ou statut WhatsApp, avec un appel à l’action hors des zones couvertes par l’interface.",
  },
  {
    id: "facebook",
    label: "Couverture Facebook",
    platform: "Facebook",
    width: 1640,
    height: 624,
    usage: "Page Facebook : le contenu évite le coin bas gauche où s’affiche la photo de profil.",
  },
  {
    id: "linkedin",
    label: "Bannière LinkedIn",
    platform: "LinkedIn",
    width: 1584,
    height: 396,
    usage: "Profil ou page entreprise LinkedIn : le contenu est à droite, la photo couvre la gauche.",
  },
  {
    id: "youtube",
    label: "Bannière YouTube",
    platform: "YouTube",
    width: 2560,
    height: 1440,
    usage: "Chaîne YouTube : tout le texte tient dans la zone visible sur mobile (1546 × 423 au centre).",
  },
];

export interface SocialContent {
  headline: string;
  cta: string;
  /** Numéro WhatsApp ou téléphone, affiché tel quel. */
  phone: string;
  /** Site web, page ou identifiant (@marque). */
  handle: string;
}

export interface SocialAsset {
  format: SocialFormat;
  svg: string;
}

/**
 * Le slogan sans le nom de la marque devant.
 *
 * « Saveurs de Douala — fait maison » répète le nom déjà présent sur chaque
 * visuel ; on garde « Fait maison ». Un slogan qui ne commence pas par le nom
 * est gardé tel quel.
 */
function socialHeadline(guide: BrandGuide, fallback: string): string {
  const tagline = guide.strategy.voice.tagline.trim();
  const name = guide.brief.name.trim();
  const rest = tagline.startsWith(name)
    ? tagline.slice(name.length).replace(/^\s*[—–:,-]\s*/, "").replace(/\.$/, "").trim()
    : "";
  if (rest.length >= 3) return rest.charAt(0).toUpperCase() + rest.slice(1);
  return tagline.replace(/\.$/, "") || fallback;
}

/** Contenu par défaut, tiré du ton de la marque. */
export function defaultSocialContent(guide: BrandGuide): SocialContent {
  const flyer = defaultContent(guide);
  const slug = guide.brief.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
  return {
    headline: socialHeadline(guide, flyer.headline),
    cta: "Écrivez-nous sur WhatsApp",
    phone: "",
    handle: `@${slug || "votremarque"}`,
  };
}

/* -------------------------------------------------------------------------- */
/*  Outils SVG                                                                */
/* -------------------------------------------------------------------------- */

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface Tokens extends SceneContext {
  radius: number;
  displayWeight: number;
  bodyWeight: number;
  upper: boolean;
  tracking: number;
  /** Fond principal de la marque : sombre pour les directions « dark ». */
  darkSurface: boolean;
  seed: number;
  positioning: string;
}

function tokensFrom(guide: BrandGuide): Tokens {
  const ctx = buildSceneContext(
    guide.brief.name,
    guide.strategy.voice.tagline,
    guide.mark.markup,
    guide.palette,
    guide.typography,
  );
  const ad = guide.strategy.artDirection;
  const display = guide.typography.find((t) => t.role === "display") ?? guide.typography[0];
  const body = guide.typography.find((t) => t.role === "body") ?? guide.typography[0];
  return {
    ...ctx,
    radius: Math.min(ad.radius, 60),
    displayWeight: Math.max(...display.weights),
    bodyWeight: body.weights.includes(500) ? 500 : body.weights[0] ?? 400,
    upper: ad.type.case === "upper",
    tracking: display.letterSpacingEm,
    darkSurface: ad.color.darkSurface,
    seed: guide.strategy.seed,
    positioning: guide.strategy.voice.positioning,
  };
}

function mark(
  t: Tokens,
  x: number,
  y: number,
  size: number,
  color: string,
  accent: string,
  bg?: string,
) {
  let painted = paintMark(t.markup, color, accent);
  /*
   * Le monogramme de secours porte ses initiales en blanc. Peint en blanc sur
   * un fond coloré, il deviendrait un carré vide : les lettres prennent alors
   * la couleur du fond, comme une découpe.
   */
  if (bg && !isDark(color)) {
    painted = painted.replace(
      /(<text\b[^>]*\bfill=")(#fff(?:fff)?|white)(")/gi,
      `$1${bg}$3`,
    );
  }
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(size / 100).toFixed(4)})">${painted}</g>`;
}

/** Couleur d'accent lisible sur un fond donné, sinon la couleur de texte. */
function accentOn(t: Tokens, bg: string): string {
  return contrastRatio(t.accent, bg) >= 3 ? t.accent : readableOn(bg);
}

interface Fit {
  lines: string[];
  size: number;
}

/**
 * Trouve la plus grande taille de police où le texte tient en `maxLines`
 * lignes dans `maxWidth`, en mesurant chaque ligne avec les métriques réelles
 * de la police plutôt qu'un nombre de caractères.
 */
/**
 * Largeur mesurée avec une marge de sécurité.
 *
 * Les métriques embarquées ne couvrent pas toutes les familles ; pour une
 * police inconnue, la largeur moyenne sous-estime les capitales. Mieux vaut
 * une ligne un peu plus courte qu'un nom coupé au bord de la bannière.
 */
export function measure(text: string, size: number, spacing: number, font: string): number {
  const letters = text.replace(/[^\p{L}]/gu, "");
  const caps = letters.replace(/[^\p{Lu}]/gu, "").length;
  const ratio = letters.length ? caps / letters.length : 0;
  return advanceWidth(text, size, spacing, font) * (1.04 + 0.14 * ratio);
}

export function fitText(
  text: string,
  font: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  maxLines: number,
  trackingEm = 0,
): Fit {
  const words = text.trim().split(/\s+/).filter(Boolean);
  for (let size = maxSize; size >= minSize; size -= 2) {
    const spacing = trackingEm * size;
    const lines: string[] = [];
    let line = "";
    let overflow = false;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate, size, spacing, font) <= maxWidth) {
        line = candidate;
      } else if (!line) {
        overflow = true; // un seul mot plus large que la zone
        line = word;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (!overflow && lines.length <= maxLines) return { lines, size };
  }
  // Taille minimale : on coupe ce qui dépasse plutôt que de déborder.
  const spacing = trackingEm * minSize;
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, minSize, spacing, font) <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  const kept = lines.slice(0, maxLines);
  if (lines.length > maxLines) kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[.,;:!?]?$/, "")}…`;
  return { lines: kept, size: minSize };
}

function textBlock(
  fit: Fit,
  opts: {
    x: number;
    y: number;
    font: string;
    weight: number;
    fill: string;
    anchor?: "start" | "middle" | "end";
    lineHeight?: number;
    tracking?: number;
  },
): string {
  const lh = (opts.lineHeight ?? 1.05) * fit.size;
  return fit.lines
    .map(
      (line, i) =>
        `<text x="${opts.x}" y="${(opts.y + i * lh).toFixed(1)}" font-family="${esc(opts.font)}" font-size="${fit.size}" font-weight="${opts.weight}" fill="${opts.fill}" text-anchor="${opts.anchor ?? "start"}" letter-spacing="${((opts.tracking ?? 0) * fit.size).toFixed(2)}">${esc(line)}</text>`,
    )
    .join("");
}

function label(
  content: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  font: string,
  weight = 600,
  anchor: "start" | "middle" | "end" = "start",
  tracking = 0,
): string {
  return `<text x="${x}" y="${y}" font-family="${esc(font)}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${tracking}">${esc(content)}</text>`;
}

/** Fine texture de grain, pour que les aplats n'aient pas l'air numériques. */
function grain(id: string, opacity: number): string {
  return `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${opacity} 0"/></filter>`;
}

function watermarkLayer(w: number, h: number, t: Tokens, bg: string): string {
  const size = Math.round(Math.min(w, h) * 0.028);
  const fill = withAlpha(readableOn(bg), 0.55);
  return `<g aria-label="Filigrane">${label("Créé avec BRAND GENIUS · version gratuite", w - size, h - size, size, fill, t.bodyFont, 600, "end", 0.5)}</g>`;
}

function frame(
  format: SocialFormat,
  body: string,
  defsBlock: string,
  t: Tokens,
  bg: string,
  watermark: boolean,
): string {
  const { width: w, height: h } = format;
  /*
   * Les identifiants (dégradé, grain) doivent être uniques : plusieurs visuels
   * sont affichés dans la même page, et un `url(#g)` partagé prendrait le
   * dégradé du premier SVG venu.
   */
  const uid = `bg-${format.id}-${t.seed.toString(36)}`;
  const scoped = (s: string) =>
    s.replace(/id="g"/g, `id="${uid}-g"`).replace(/url\(#g\)/g, `url(#${uid}-g)`).replace(/bg-grain/g, `${uid}-grain`);
  body = scoped(body);
  defsBlock = scoped(defsBlock);
  const grainId = `${uid}-grain`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(`${t.brandName} · ${format.label}`)}"><defs>${defsBlock}${grain(grainId, 0.06)}</defs>${body}<rect width="${w}" height="${h}" filter="url(#${grainId})" opacity="0.5"/>${watermark ? watermarkLayer(w, h, t, bg) : ""}</svg>`;
}

function display(t: Tokens, text: string): string {
  return t.upper ? text.toUpperCase() : text;
}

/** Un dégradé très doux dans la teinte, pour donner de la profondeur aux aplats. */
function depthGradient(id: string, base: string): string {
  return `<radialGradient id="${id}" cx="30%" cy="20%" r="95%"><stop offset="0%" stop-color="${lighten(base, 0.08)}"/><stop offset="100%" stop-color="${darken(base, 0.12)}"/></radialGradient>`;
}

/* -------------------------------------------------------------------------- */
/*  Les formats                                                               */
/* -------------------------------------------------------------------------- */

function profil(t: Tokens, f: SocialFormat, _c: SocialContent, wm: boolean): string {
  // Fond clair et symbole dans ses vraies couleurs : c'est la version la plus
  // fidèle au logo, et elle reste lisible une fois rognée en rond à 40 px.
  const bg = t.darkSurface ? t.ink : t.paper;
  const ink = t.darkSurface ? lighten(t.primary, 0.25) : t.primary;
  const size = 600;
  const body = `<rect width="1080" height="1080" fill="url(#g)"/>${mark(t, (1080 - size) / 2, (1080 - size) / 2, size, ink, t.accent, bg)}`;
  return frame(f, body, depthGradient("g", bg), t, bg, wm);
}

function postCarre(t: Tokens, f: SocialFormat, c: SocialContent, wm: boolean): string {
  const bg = t.darkSurface ? t.ink : t.paper;
  const fg = readableOn(bg);
  const ink = t.darkSurface ? fg : contrastRatio(t.primary, bg) >= 4.5 ? t.primary : fg;
  const accent = accentOn(t, bg);
  const head = fitText(display(t, c.headline), t.displayFont, 880, 132, 56, 4, t.tracking);
  const lh = head.size * 1.02;
  const sub = fitText(t.positioning, t.bodyFont, 820, 38, 26, 3);
  const subLh = sub.size * 1.4;
  const headH = (head.lines.length - 1) * lh + head.size;
  const subH = (sub.lines.length - 1) * subLh + sub.size;
  const blockTop = 540 - (headH + 56 + subH) / 2;
  const top = blockTop + head.size * 0.8;
  const subTop = blockTop + headH + 56 + sub.size * 0.8;
  const r = t.radius;
  const body = `<rect width="1080" height="1080" fill="${bg}"/>
${mark(t, 100, 96, 92, ink, accent, bg)}${label(t.brandName, 212, 156, 34, fg, t.displayFont, t.displayWeight, "start", 0)}
${textBlock(head, { x: 100, y: top, font: t.displayFont, weight: t.displayWeight, fill: ink, lineHeight: 1.02, tracking: t.tracking })}
${textBlock(sub, { x: 100, y: subTop, font: t.bodyFont, weight: t.bodyWeight, fill: withAlpha(fg, 0.72), lineHeight: 1.4 })}
<rect x="100" y="900" width="140" height="10" rx="${Math.min(5, r)}" fill="${accent}"/>
${label(c.handle, 980, 984, 30, withAlpha(fg, 0.7), t.bodyFont, t.bodyWeight, "end")}`;
  return frame(f, body, "", t, bg, wm);
}

function postPortrait(t: Tokens, f: SocialFormat, c: SocialContent, wm: boolean): string {
  const bg = t.primary;
  const fg = readableOn(bg);
  const accent = accentOn(t, bg);
  const head = fitText(display(t, c.headline), t.displayFont, 860, 140, 60, 5, t.tracking);
  const lh = head.size * 1.02;
  const blockH = (head.lines.length - 1) * lh;
  const top = 700 - blockH / 2;
  const big = 900;
  const body = `<rect width="1080" height="1350" fill="url(#g)"/>
<g opacity="0.12">${mark(t, 1080 - big * 0.62, -big * 0.18, big, fg, fg, bg)}</g>
${textBlock(head, { x: 110, y: top, font: t.displayFont, weight: t.displayWeight, fill: fg, lineHeight: 1.02, tracking: t.tracking })}
<rect x="110" y="${(top + blockH + head.size * 0.7).toFixed(0)}" width="120" height="10" rx="${Math.min(5, t.radius)}" fill="${accent === fg ? mix(fg, bg, 0.4) : accent}"/>
${mark(t, 110, 1150, 84, fg, accent === fg ? mix(fg, bg, 0.4) : accent, bg)}${label(t.brandName, 214, 1206, 34, fg, t.displayFont, t.displayWeight)}
${label(c.handle, 970, 1206, 28, withAlpha(fg, 0.75), t.bodyFont, t.bodyWeight, "end")}`;
  return frame(f, body, depthGradient("g", bg), t, bg, wm);
}

function story(t: Tokens, f: SocialFormat, c: SocialContent, wm: boolean): string {
  const bg = isDark(t.secondary) ? t.secondary : t.ink;
  const fg = readableOn(bg);
  const accent = accentOn(t, bg);
  const pillBg = contrastRatio(t.accent, bg) >= 3 ? t.accent : t.primary;
  const pillFg = readableOn(pillBg);
  const head = fitText(display(t, c.headline), t.displayFont, 860, 150, 64, 5, t.tracking);
  const lh = head.size * 1.04;
  const blockH = (head.lines.length - 1) * lh;
  const top = 900 - blockH / 2;
  const pillText = fitText(c.cta, t.bodyFont, 700, 44, 30, 1);
  const pillW = Math.min(900, measure(pillText.lines[0] ?? "", pillText.size, 0, t.bodyFont) + 140);
  const pillR = t.radius >= 999 || t.radius > 20 ? 60 : Math.max(8, t.radius);
  // Zones couvertes par l'interface : ~250 px en haut, ~340 px en bas.
  const body = `<rect width="1080" height="1920" fill="url(#g)"/>
${mark(t, 440, 330, 200, fg, accent, bg)}
${label(display(t, t.brandName), 540, 610, 40, withAlpha(fg, 0.8), t.displayFont, t.displayWeight, "middle", 4)}
${textBlock(head, { x: 540, y: top, font: t.displayFont, weight: t.displayWeight, fill: fg, anchor: "middle", lineHeight: 1.04, tracking: t.tracking })}
<rect x="${((1080 - pillW) / 2).toFixed(0)}" y="1360" width="${pillW.toFixed(0)}" height="120" rx="${pillR}" fill="${pillBg}"/>
${label(pillText.lines[0] ?? "", 540, 1435, pillText.size, pillFg, t.bodyFont, 700, "middle")}
${c.phone ? label(c.phone, 540, 1548, 40, withAlpha(fg, 0.85), t.bodyFont, t.bodyWeight, "middle") : ""}`;
  return frame(f, body, depthGradient("g", bg), t, bg, wm);
}

function banner(
  t: Tokens,
  f: SocialFormat,
  c: SocialContent,
  wm: boolean,
  zone: { x: number; y: number; w: number; h: number },
  align: "start" | "end" | "middle",
): string {
  const { width: w, height: h } = f;
  const bg = t.primary;
  const fg = readableOn(bg);
  const accent = accentOn(t, bg);
  const markSize = Math.round(zone.h * 0.62);
  const gap = Math.round(zone.h * 0.16);
  const textW = zone.w - markSize - gap;
  const name = fitText(display(t, t.brandName), t.displayFont, textW, Math.round(zone.h * 0.36), 24, 1, t.tracking);
  const tag = fitText(c.headline, t.bodyFont, textW, Math.round(zone.h * 0.15), 16, 2);
  const nameW = measure(name.lines[0] ?? "", name.size, t.tracking * name.size, t.displayFont);
  const tagW = Math.max(...tag.lines.map((l) => measure(l, tag.size, 0, t.bodyFont)));
  const contentW = markSize + gap + Math.max(nameW, tagW);
  const x0 =
    align === "start" ? zone.x : align === "end" ? zone.x + zone.w - contentW : zone.x + (zone.w - contentW) / 2;
  const cy = zone.y + zone.h / 2;
  const tx = x0 + markSize + gap;
  const big = h * 1.6;
  const body = `<rect width="${w}" height="${h}" fill="url(#g)"/>
<g opacity="0.1">${mark(t, w - big * 0.55, (h - big) / 2, big, fg, fg, bg)}</g>
${mark(t, x0, cy - markSize / 2, markSize, fg, accent === fg ? mix(fg, bg, 0.4) : accent, bg)}
${textBlock(name, { x: tx, y: cy - (tag.lines.length * tag.size * 1.3 + name.size * 0.25) / 2 + name.size * 0.35, font: t.displayFont, weight: t.displayWeight, fill: fg, tracking: t.tracking })}
${textBlock(tag, { x: tx, y: cy - (tag.lines.length * tag.size * 1.3 + name.size * 0.25) / 2 + name.size * 0.35 + name.size * 0.3 + tag.size * 1.25, font: t.bodyFont, weight: t.bodyWeight, fill: withAlpha(fg, 0.82), lineHeight: 1.3 })}`;
  return frame(f, body, depthGradient("g", bg), t, bg, wm);
}

const RENDERERS: Record<
  SocialFormatId,
  (t: Tokens, f: SocialFormat, c: SocialContent, wm: boolean) => string
> = {
  profil,
  "post-carre": postCarre,
  "post-portrait": postPortrait,
  story,
  // Facebook : la photo de profil couvre le bas gauche, on centre à droite.
  facebook: (t, f, c, wm) => banner(t, f, c, wm, { x: 520, y: 150, w: 1000, h: 324 }, "middle"),
  // LinkedIn : la photo couvre la gauche, on aligne à droite.
  linkedin: (t, f, c, wm) => banner(t, f, c, wm, { x: 560, y: 88, w: 940, h: 220 }, "end"),
  // YouTube : zone visible partout = 1546 × 423 au centre.
  youtube: (t, f, c, wm) => banner(t, f, c, wm, { x: 507, y: 509, w: 1546, h: 423 }, "middle"),
};

export function generateSocialKit(
  guide: BrandGuide,
  options: { content?: Partial<SocialContent>; watermark?: boolean } = {},
): SocialAsset[] {
  const t = tokensFrom(guide);
  const content = { ...defaultSocialContent(guide), ...options.content };
  // Un champ vidé par l'utilisateur ne doit pas laisser de trou dans le visuel.
  if (!content.headline.trim()) content.headline = defaultSocialContent(guide).headline;
  return SOCIAL_FORMATS.map((format) => ({
    format,
    svg: RENDERERS[format.id](t, format, content, options.watermark ?? false),
  }));
}
