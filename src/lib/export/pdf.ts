"use client";

import { jsPDF } from "jspdf";
import { svg2pdf } from "svg2pdf.js";
import { formatCmyk, formatRgb, hexToRgb } from "../color";
import { inlineExternalImages } from "./inline-images";
import { embedBrandFonts, type EmbeddedFonts } from "./fonts";
import { generateFlyers } from "../ai/flyer";
import type { BrandGuide, Mockup } from "../types";

/**
 * Brand guide PDF export.
 *
 * Runs entirely in the browser: jsPDF for layout, svg2pdf for the vector
 * artwork. Keeping it client-side means logos and mockups stay vector in the
 * output and the deployment needs no headless browser or native rasteriser.
 *
 * The brand's own typefaces are embedded from `/api/font`, so the specimens are
 * set in the family the guide is prescribing rather than in Helvetica. If a
 * font cannot be fetched, that style falls back and the document says so on the
 * typography page instead of quietly showing the wrong face.
 */

const PAGE = { width: 210, height: 297 }; // A4 portrait, millimetres
const MARGIN = 18;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

interface Ctx {
  doc: jsPDF;
  guide: BrandGuide;
  page: number;
  fonts: EmbeddedFonts;
  /** Section title -> printed page number, collected as pages are written. */
  toc: Array<[string, number]>;
}

/** Sets the display face, falling back to Helvetica bold when none embedded. */
function display(ctx: Ctx, size: number) {
  if (ctx.fonts.display === "helvetica") ctx.doc.setFont("helvetica", "bold");
  else ctx.doc.setFont(ctx.fonts.display, "normal");
  ctx.doc.setFontSize(size);
}

/** Sets the body face, falling back to Helvetica. */
function body(ctx: Ctx, size: number, style: "normal" | "bold" = "normal") {
  if (ctx.fonts.body === "helvetica") ctx.doc.setFont("helvetica", style);
  else ctx.doc.setFont(ctx.fonts.body, "normal");
  ctx.doc.setFontSize(size);
}

/**
 * Builds the document and returns it as a Blob.
 *
 * Separated from saving so the bundle export can put the same bytes into a ZIP
 * without generating the document twice.
 */
export async function buildBrandGuidePdf(guide: BrandGuide): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const fonts = await embedBrandFonts(doc, guide);
  const ctx: Ctx = { doc, guide, page: 0, fonts, toc: [] };

  /*
   * The contents page is written first but numbered last: its entries are only
   * known once the later sections have been laid out, and mockups and flyers
   * both span a variable number of pages. The previous version hard-coded
   * "3, 4, 5, 6, 7", which was wrong for any brand with more than four mockups.
   */
  await coverPage(ctx);
  const contentsPageIndex = reserveContentsPage(ctx);

  await logoPage(ctx);
  await directionPage(ctx);
  palettePage(ctx);
  typographyPage(ctx);
  voicePage(ctx);
  usagePage(ctx);
  await mockupPages(ctx);
  await flyerPages(ctx);

  writeContents(ctx, contentsPageIndex);

  return doc.output("blob");
}

export async function exportBrandGuidePdf(guide: BrandGuide): Promise<void> {
  const blob = await buildBrandGuidePdf(guide);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug(guide.brief.name)}-brand-guide.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

export { slug as brandSlug };

/* -------------------------------------------------------------------------- */
/*  Pages                                                                     */
/* -------------------------------------------------------------------------- */

async function coverPage(ctx: Ctx) {
  const { doc, guide } = ctx;
  const primary = guide.palette.find((s) => s.role === "primary") ?? guide.palette[0];
  const [r, g, b] = hexToRgb(primary.hex);

  doc.setFillColor(r, g, b);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");

  const inverted =
    guide.logo.find((v) => v.id === "inverted") ?? guide.logo[0];
  await drawSvg(doc, inverted.svg, MARGIN, 90, 90, 40);

  const onColor = hexToRgb(primary.onColor);
  doc.setTextColor(onColor[0], onColor[1], onColor[2]);

  display(ctx, 34);
  doc.text(guide.brief.name, MARGIN, 160, { maxWidth: CONTENT_WIDTH });

  body(ctx, 14);
  doc.setTextColor(onColor[0], onColor[1], onColor[2]);
  doc.text("Brand Guidelines", MARGIN, 174);

  body(ctx, 9);
  doc.setTextColor(onColor[0], onColor[1], onColor[2]);
  doc.text(
    [
      guide.brief.industry,
      new Date(guide.generatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      "Generated with BRAND GENIUS",
    ].join("   ·   "),
    MARGIN,
    PAGE.height - MARGIN,
  );
}

/** Adds the contents page now and returns its index, to be filled in later. */
function reserveContentsPage(ctx: Ctx): number {
  newPage(ctx, "Contents", { inToc: false });
  footer(ctx);
  return ctx.doc.getNumberOfPages();
}

function writeContents(ctx: Ctx, pageIndex: number) {
  const { doc } = ctx;
  doc.setPage(pageIndex);

  let y = 62;
  for (const [index, [label, page]] of ctx.toc.entries()) {
    body(ctx, 9, "bold");
    doc.setTextColor(150);
    doc.text(String(index + 1).padStart(2, "0"), MARGIN, y);

    display(ctx, 13);
    doc.setTextColor(20);
    doc.text(label, MARGIN + 14, y);

    body(ctx, 9);
    doc.setTextColor(150);
    doc.text(String(page), PAGE.width - MARGIN, y, { align: "right" });

    doc.setDrawColor(228);
    doc.line(MARGIN, y + 5, PAGE.width - MARGIN, y + 5);
    y += 14;
  }

  body(ctx, 10);
  doc.setTextColor(90);
  doc.text(ctx.guide.strategy.voice.positioning, MARGIN, y + 14, {
    maxWidth: CONTENT_WIDTH,
    lineHeightFactor: 1.5,
  });
}

/**
 * The art direction, which is the decision every other page derives from.
 *
 * The app leads with it and the PDF did not mention it at all, so a printed
 * guide read as a set of unrelated choices rather than as one system.
 */
async function directionPage(ctx: Ctx) {
  const { doc, guide } = ctx;
  const ad = guide.strategy.artDirection;
  newPage(ctx, "Art direction");

  display(ctx, 24);
  doc.setTextColor(20);
  doc.text(ad.name, MARGIN, 60, { maxWidth: CONTENT_WIDTH });

  body(ctx, 10);
  doc.setTextColor(90);
  const rationale = doc.splitTextToSize(
    guide.strategy.artDirectionRationale ?? ad.description,
    CONTENT_WIDTH,
  );
  doc.text(rationale, MARGIN, 70, { lineHeightFactor: 1.5 });

  let y = 74 + rationale.length * 5.2;

  const rows: Array<[string, string]> = [
    ["Corner radius", ad.radius >= 999 ? "Full (pill)" : `${ad.radius}px`],
    ["Stroke", `${ad.stroke}px`],
    ["Type scale", String(ad.type.scale)],
    ["Colour harmony", ad.color.harmony.replace(/-/g, " ")],
    ["Saturation", ad.color.saturation],
    ["Neutrals", `${ad.color.neutrals} tinted`],
    ["White space", `${Math.round(ad.whitespaceRatio * 100)}%`],
    ["Grid", `${ad.grid.columns} columns · ${ad.grid.gutter}px gutter`],
    ["Shapes", ad.shapes],
    ["Iconography", ad.iconography],
    ["Imagery", ad.imagery],
    ["Texture", ad.texture],
    ["Shadow", ad.shadow],
    ["Layout signature", ad.layoutSignature],
  ];

  for (const [label, value] of rows) {
    if (y > PAGE.height - 34) break;
    body(ctx, 8, "bold");
    doc.setTextColor(140);
    doc.text(label.toUpperCase(), MARGIN, y);

    body(ctx, 9.5);
    doc.setTextColor(30);
    doc.text(String(value), MARGIN + 46, y, { maxWidth: CONTENT_WIDTH - 46 });

    doc.setDrawColor(236);
    doc.line(MARGIN, y + 3, PAGE.width - MARGIN, y + 3);
    y += 9;
  }

  // The tonal ramp, which is what a developer implements the brand from.
  if (y < PAGE.height - 40) {
    y += 4;
    body(ctx, 8, "bold");
    doc.setTextColor(140);
    doc.text("PRIMARY SCALE", MARGIN, y);
    y += 4;

    const steps = Object.keys(guide.primaryScale)
      .map(Number)
      .sort((a, b) => a - b);
    const swatchW = CONTENT_WIDTH / steps.length;
    for (const [i, step] of steps.entries()) {
      const [r, g, b] = hexToRgb(guide.primaryScale[step]);
      doc.setFillColor(r, g, b);
      doc.rect(MARGIN + i * swatchW, y, swatchW, 12, "F");
    }
    y += 15;
    body(ctx, 6);
    doc.setTextColor(140);
    for (const [i, step] of steps.entries()) {
      doc.text(String(step), MARGIN + i * swatchW + swatchW / 2, y, {
        align: "center",
      });
    }
  }

  footer(ctx);
}

/** Tone of voice: the half of an identity that is not drawn. */
function voicePage(ctx: Ctx) {
  const { doc, guide } = ctx;
  const { voice } = guide.strategy;
  newPage(ctx, "Tone of voice");

  display(ctx, 18);
  doc.setTextColor(20);
  const positioning = doc.splitTextToSize(voice.positioning, CONTENT_WIDTH);
  doc.text(positioning, MARGIN, 60, { lineHeightFactor: 1.3 });

  let y = 64 + positioning.length * 7.5;

  body(ctx, 10);
  doc.setTextColor(110);
  doc.text(`“${voice.tagline}”`, MARGIN, y, { maxWidth: CONTENT_WIDTH });
  y += 12;

  body(ctx, 8, "bold");
  doc.setTextColor(140);
  doc.text("PERSONALITY", MARGIN, y);
  y += 6;
  body(ctx, 10);
  doc.setTextColor(30);
  doc.text(voice.personality.join("   ·   "), MARGIN, y, {
    maxWidth: CONTENT_WIDTH,
  });
  y += 14;

  for (const [label, items, tint] of [
    ["DO", voice.toneDo, [9, 123, 78]],
    ["DON'T", voice.toneDont, [200, 42, 54]],
  ] as const) {
    if (y > PAGE.height - 40) break;
    body(ctx, 9, "bold");
    doc.setTextColor(tint[0], tint[1], tint[2]);
    doc.text(label, MARGIN, y);
    y += 6;

    for (const item of items) {
      if (y > PAGE.height - 30) break;
      body(ctx, 9.5);
      doc.setTextColor(60);
      const lines = doc.splitTextToSize(`—  ${item}`, CONTENT_WIDTH - 4);
      doc.text(lines, MARGIN, y);
      y += lines.length * 4.6 + 2.5;
    }
    y += 6;
  }

  footer(ctx);
}

/**
 * Flyers, drawn at true trim size so the printed page is a real proof rather
 * than a thumbnail. Anything larger than the printable area is scaled to fit.
 */
async function flyerPages(ctx: Ctx) {
  const { doc, guide } = ctx;

  let flyers;
  try {
    flyers = generateFlyers(guide, { formats: ["a5", "a6", "dl"] });
  } catch {
    return; // A guide that cannot lay out flyers still gets the rest.
  }
  if (flyers.length === 0) return;

  newPage(ctx, "Flyers");

  const maxW = (CONTENT_WIDTH - 10) / 2;
  const maxH = 92;

  for (const [index, flyer] of flyers.entries()) {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + col * (maxW + 10);
    const y = 58 + row * (maxH + 16);
    if (y + maxH > PAGE.height - 26) break;

    await drawSvg(doc, flyer.svg, x, y, maxW, maxH);

    body(ctx, 7.5, "bold");
    doc.setTextColor(70);
    doc.text(flyer.format.label.toUpperCase(), x, y + maxH + 5);

    body(ctx, 7);
    doc.setTextColor(140);
    doc.text(
      `${flyer.format.width}×${flyer.format.height}mm  ·  3mm bleed  ·  hierarchy ${flyer.hierarchyRatio.toFixed(1)}:1`,
      x,
      y + maxH + 9.5,
    );
  }

  footer(ctx);
}

async function logoPage(ctx: Ctx) {
  const { doc, guide } = ctx;
  newPage(ctx, "Logo & variations");

  const cell = { w: (CONTENT_WIDTH - 8) / 2, h: 46 };
  let x = MARGIN;
  let y = 56;

  for (const variant of guide.logo) {
    if (y + cell.h > PAGE.height - 30) break;

    if (variant.background === "dark") {
      doc.setFillColor(20, 22, 26);
    } else if (variant.background === "neutral") {
      doc.setFillColor(242, 240, 234);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.setDrawColor(228);
    doc.roundedRect(x, y, cell.w, cell.h, 2, 2, "FD");

    await drawSvg(doc, variant.svg, x + 8, y + 8, cell.w - 16, cell.h - 20);

    body(ctx, 7.5, "bold");
    doc.setTextColor(
      variant.background === "dark" ? 255 : 60,
      variant.background === "dark" ? 255 : 60,
      variant.background === "dark" ? 255 : 60,
    );
    doc.text(variant.label.toUpperCase(), x + 8, y + cell.h - 6);

    if (x === MARGIN) {
      x = MARGIN + cell.w + 8;
    } else {
      x = MARGIN;
      y += cell.h + 8;
    }
  }

  footer(ctx);
}

function palettePage(ctx: Ctx) {
  const { doc, guide } = ctx;
  newPage(ctx, "Colour palette");

  let y = 56;
  const groups: Array<[string, string]> = [
    ["primary", "Primary"],
    ["secondary", "Secondary"],
    ["accent", "Accent"],
    ["neutral", "Neutrals"],
  ];

  for (const [role, label] of groups) {
    const swatches = guide.palette.filter((s) => s.role === role);
    if (swatches.length === 0) continue;
    if (y > PAGE.height - 60) break;

    body(ctx, 8, "bold");
    doc.setTextColor(140);
    doc.text(label.toUpperCase(), MARGIN, y);
    y += 5;

    for (const swatch of swatches) {
      if (y + 20 > PAGE.height - 26) break;

      const [r, g, b] = swatch.rgb;
      doc.setFillColor(r, g, b);
      doc.roundedRect(MARGIN, y, 26, 18, 1.5, 1.5, "F");

      display(ctx, 10);
      doc.setTextColor(20);
      doc.text(swatch.name, MARGIN + 31, y + 6);

      // Print codes stay monospaced, so columns of hex values line up.
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(
        `${swatch.hex}    ${formatRgb(swatch.rgb)}    ${formatCmyk(swatch.cmyk)}`,
        MARGIN + 31,
        y + 12,
      );

      body(ctx, 7.5);
      doc.setTextColor(140);
      doc.text(swatch.usage, MARGIN + 31, y + 17, {
        maxWidth: CONTENT_WIDTH - 33,
      });

      y += 22;
    }
    y += 4;
  }

  footer(ctx);
}

function typographyPage(ctx: Ctx) {
  const { doc, guide } = ctx;
  newPage(ctx, "Typography");

  // Each specimen is set in whichever brand face was embedded for its role, so
  // the page shows the typeface rather than merely naming it.
  const faceFor = (role: string) =>
    role === "display" || role === "heading" ? ctx.fonts.display : ctx.fonts.body;

  let y = 56;
  for (const style of guide.typography) {
    if (y > PAGE.height - 52) break;

    body(ctx, 8, "bold");
    doc.setTextColor(140);
    doc.text(style.role.toUpperCase(), MARGIN, y);

    const face = faceFor(style.role);
    if (face === "helvetica") doc.setFont("helvetica", "bold");
    else doc.setFont(face, "normal");
    doc.setFontSize(20);
    doc.setTextColor(20);
    doc.text(style.family, MARGIN, y + 10);

    // A real specimen line, in the real face, using the brand's own words.
    doc.setFontSize(13);
    doc.setTextColor(60);
    doc.text(
      specimenFor(style.role, guide),
      MARGIN,
      y + 20,
      { maxWidth: CONTENT_WIDTH },
    );

    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(
      `${style.sizePx}px  ·  line-height ${style.lineHeight}  ·  tracking ${style.letterSpacingEm}em  ·  weights ${style.weights.join("/")}`,
      MARGIN,
      y + 27,
    );

    body(ctx, 8.5);
    doc.setTextColor(90);
    doc.text(style.usage, MARGIN, y + 33, { maxWidth: CONTENT_WIDTH });

    if (style.googleFontsHref) {
      body(ctx, 7);
      doc.setTextColor(155);
      doc.text(style.googleFontsHref, MARGIN, y + 39, {
        maxWidth: CONTENT_WIDTH,
      });
    }

    doc.setDrawColor(232);
    doc.line(MARGIN, y + 44, PAGE.width - MARGIN, y + 44);
    y += 54;
  }

  // Only say something is substituted when it actually is.
  if (ctx.fonts.missing.length > 0) {
    body(ctx, 7.5);
    doc.setTextColor(150);
    doc.text(
      `Set in Helvetica in this document because the file could not be fetched: ${[
        ...new Set(ctx.fonts.missing),
      ].join(", ")}. Load it from the link above for production artwork.`,
      MARGIN,
      PAGE.height - 28,
      { maxWidth: CONTENT_WIDTH },
    );
  }

  footer(ctx);
}

function usagePage(ctx: Ctx) {
  const { doc, guide } = ctx;
  newPage(ctx, "Logo usage");

  body(ctx, 9.5);
  doc.setTextColor(60);
  doc.text(
    `Clear space: ${guide.logoUsage.clearSpaceRatio}× the mark's height on every side.    Minimum size: ${guide.logoUsage.minWidthPx}px on screen, ${guide.logoUsage.minWidthMm}mm in print.`,
    MARGIN,
    56,
    { maxWidth: CONTENT_WIDTH, lineHeightFactor: 1.5 },
  );

  let y = 74;
  for (const kind of ["do", "dont"] as const) {
    const rules = guide.logoUsage.rules.filter((r) => r.kind === kind);
    if (rules.length === 0) continue;

    body(ctx, 9, "bold");
    // The depths that clear AA, matching the app's own semantic pair.
    doc.setTextColor(kind === "do" ? 9 : 200, kind === "do" ? 123 : 42, kind === "do" ? 78 : 54);
    doc.text(kind === "do" ? "DO" : "DON'T", MARGIN, y);
    y += 7;

    for (const rule of rules) {
      if (y > PAGE.height - 34) break;

      display(ctx, 9.5);
      doc.setTextColor(20);
      doc.text(rule.title, MARGIN, y);

      body(ctx, 8.5);
      doc.setTextColor(95);
      const lines = doc.splitTextToSize(rule.detail, CONTENT_WIDTH);
      doc.text(lines, MARGIN, y + 5);

      y += 8 + lines.length * 4.2;
    }
    y += 6;
  }

  footer(ctx);
}

async function mockupPages(ctx: Ctx) {
  const { guide } = ctx;
  const perPage = 4;

  for (let i = 0; i < guide.mockups.length; i += perPage) {
    const batch = guide.mockups.slice(i, i + perPage);
    newPage(ctx, i === 0 ? "Mockups" : "Mockups (continued)", {
      inToc: i === 0,
    });
    await drawMockupGrid(ctx, batch);
    footer(ctx);
  }
}

async function drawMockupGrid(ctx: Ctx, mockups: Mockup[]) {
  const { doc } = ctx;
  const cellW = (CONTENT_WIDTH - 8) / 2;
  const cellH = 86;

  for (const [index, mockup] of mockups.entries()) {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + col * (cellW + 8);
    const y = 56 + row * (cellH + 10);

    doc.setDrawColor(228);
    doc.setFillColor(251, 250, 247);
    doc.roundedRect(x, y, cellW, cellH, 2, 2, "FD");

    await drawSvg(doc, mockup.svg, x + 4, y + 4, cellW - 8, cellH - 14);

    body(ctx, 7.5, "bold");
    doc.setTextColor(70);
    doc.text(mockup.title.toUpperCase(), x + 4, y + cellH - 4);
  }
}

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

function newPage(ctx: Ctx, title: string, options: { inToc?: boolean } = {}) {
  ctx.doc.addPage();
  ctx.page += 1;

  // Recorded here rather than declared up front, so the contents cannot drift
  // out of step with what was actually written.
  if (options.inToc !== false) ctx.toc.push([title, ctx.page + 1]);

  display(ctx, 20);
  ctx.doc.setTextColor(20);
  ctx.doc.text(title, MARGIN, 34);

  ctx.doc.setDrawColor(20);
  ctx.doc.setLineWidth(0.6);
  ctx.doc.line(MARGIN, 40, MARGIN + 22, 40);
  ctx.doc.setLineWidth(0.2);
}

function footer(ctx: Ctx) {
  const { doc, guide, page } = ctx;
  body(ctx, 7);
  doc.setTextColor(160);
  doc.text(
    `${guide.brief.name}  ·  Brand Guidelines`,
    MARGIN,
    PAGE.height - 12,
  );
  doc.text(String(page + 1), PAGE.width - MARGIN, PAGE.height - 12, {
    align: "right",
  });
}

/**
 * Renders an SVG string into the PDF, scaled to fit the box while keeping its
 * aspect ratio. Failures are contained: one unrenderable scene must not lose
 * the whole document.
 */
async function drawSvg(
  doc: jsPDF,
  svg: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
): Promise<void> {
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden";
  // svg2pdf has to resolve every reference while writing the page, so a
  // mockup's backplate is inlined first.
  host.innerHTML = await inlineExternalImages(svg);
  document.body.append(host);

  try {
    const element = host.querySelector("svg");
    if (!element) return;

    const { width, height } = intrinsicSize(element);
    const scale = Math.min(maxWidth / width, maxHeight / height);
    const w = width * scale;
    const h = height * scale;

    await svg2pdf(element, doc, {
      x: x + (maxWidth - w) / 2,
      y: y + (maxHeight - h) / 2,
      width: w,
      height: h,
    });
  } catch (err) {
    console.error("Could not render an SVG into the PDF:", err);
  } finally {
    host.remove();
  }
}

function intrinsicSize(element: SVGElement): {
  width: number;
  height: number;
} {
  const viewBox = element.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }
  return {
    width: Number(element.getAttribute("width")) || 100,
    height: Number(element.getAttribute("height")) || 100,
  };
}

/** Specimen text per role, in the brand's own words rather than lorem ipsum. */
function specimenFor(role: string, guide: BrandGuide): string {
  switch (role) {
    case "display":
      return guide.brief.name;
    case "heading":
      return guide.strategy.voice.tagline;
    case "data":
      return `${guide.brief.name.toUpperCase()} · ${guide.strategy.sector.toUpperCase()}`;
    default:
      return guide.strategy.voice.positioning;
  }
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "brand"
  );
}
