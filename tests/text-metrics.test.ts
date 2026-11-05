import { describe, expect, it } from "vitest";
import {
  advanceWidth,
  primaryFamily,
  MEASURED_FAMILIES,
} from "@/lib/ai/text-metrics";
import { FONT_FAMILY_NAMES } from "@/lib/ai/fonts";
import { PHOTO_SCENES, renderPhotoScene } from "@/lib/ai/photo-scenes";
import { buildSceneContext } from "@/lib/ai/mockups";
import { fallbackStrategy } from "@/lib/ai/strategy";
import { fallbackMark, buildLogoVariants } from "@/lib/ai/logo";
import type { BrandBrief } from "@/lib/types";

/**
 * Lockup measurement and centring.
 *
 * A wordmark drawn on the server has to be boxed without any font loaded. When
 * that box was computed from a flat per-character factor it came out 31-59%
 * too wide on ordinary names, and because the surrounding <svg> centres the
 * declared box rather than the artwork, the phantom gutter pushed every mockup
 * lockup to the left. These tests hold both halves of the fix: the estimate is
 * close, and the composition is symmetric even when the estimate is not.
 */

const BRIEF: BrandBrief = {
  name: "Lumen Roasters",
  industry: "Specialty coffee roastery",
  keywords: "single-origin, transparent sourcing, slow craft",
};

/**
 * Ground truth: canvas `measureText` at weight 700 in a browser with the real
 * Google Font loaded, as a multiple of font size. Each pair uses a different
 * face on purpose — the widest (Unbounded) through the narrowest (Archivo
 * Narrow) and a monospace — because collapsing the catalogue into one averaged
 * table is precisely the error these numbers exist to catch.
 */
const MEASURED: Array<[string, string, number]> = [
  ["Bricolage Grotesque", "Lumen Roasters", 7.8813],
  ["Archivo", "North Signal", 5.889],
  ["Figtree", "Verdant Clinic", 6.56],
  ["Fraunces", "Atelier Frame", 6.8912],
  ["Unbounded", "Harbor & Field", 8.8666],
  ["Archivo Narrow", "Illinois Lithium", 5.787],
  ["Playfair Display", "WM", 1.895],
  ["Syne", "Wowzer Mammoth", 10.75],
  ["Oswald", "Cafe Vertigo", 5.018],
  ["Space Mono", "Data Foundry", 7.344],
];

describe("advanceWidth", () => {
  /*
   * Within 1.5%, not exactly. Summing per-character advances cannot reproduce
   * kerning: the browser tightens pairs like "Wo" and "Va" when it lays the
   * whole string out, so the sum runs slightly long. The worst case in this
   * sample is Syne at 0.93%, which moves a lockup by well under a pixel at the
   * sizes these are drawn — far below the 31-59% the flat factor was out by.
   */
  it.each(MEASURED)("measures %s / %s within 1.5%", (font, name, real) => {
    const estimate = advanceWidth(name, 1, 0, font);
    expect(Math.abs(estimate / real - 1)).toBeLessThan(0.015);
  });

  it("beats a flat per-character factor on every sample", () => {
    for (const [font, name, real] of MEASURED) {
      const flat = Math.abs((name.length * 0.68) / real - 1);
      const table = Math.abs(advanceWidth(name, 1, 0, font) / real - 1);
      expect(table, `${name}: table ${table} vs flat ${flat}`).toBeLessThan(
        flat,
      );
    }
  });

  it("distinguishes the faces rather than averaging them away", () => {
    // The same name in the widest and narrowest catalogue faces must not
    // measure the same, or the per-family table is not being consulted.
    const wide = advanceWidth("Harbor & Field", 1, 0, "Unbounded");
    const narrow = advanceWidth("Harbor & Field", 1, 0, "Archivo Narrow");
    expect(wide / narrow).toBeGreaterThan(1.4);
  });

  it("reads the first family out of a CSS stack", () => {
    expect(primaryFamily('"Fraunces", Georgia, serif')).toBe("Fraunces");
    expect(primaryFamily("Archivo Narrow, sans-serif")).toBe("Archivo Narrow");
    expect(advanceWidth("Atelier Frame", 1, 0, '"Fraunces", Georgia, serif')).toBe(
      advanceWidth("Atelier Frame", 1, 0, "Fraunces"),
    );
  });

  it("falls back to the catalogue mean for an unknown family", () => {
    const unknown = advanceWidth("Lumen Roasters", 1, 0, "Not A Real Face");
    expect(unknown).toBeGreaterThan(0);
    // Between the extremes it averages, rather than matching either.
    expect(unknown).toBeLessThan(
      advanceWidth("Lumen Roasters", 1, 0, "Unbounded"),
    );
    expect(unknown).toBeGreaterThan(
      advanceWidth("Lumen Roasters", 1, 0, "Archivo Narrow"),
    );
  });

  it("carries every family the catalogue can pick", () => {
    /*
     * Set coverage, not a count. Counting `MEASURED_FAMILIES` cannot fail when
     * a font is added to the catalogue — the measured list is what stays the
     * same — so the count would stay green while the new family silently fell
     * back to the mean and its lockups drifted off centre. Compare the two
     * lists directly, and name what is missing.
     */
    const measured = new Set(MEASURED_FAMILIES);
    const unmeasured = [...new Set(FONT_FAMILY_NAMES)]
      .filter((family) => !measured.has(family))
      .sort();

    expect(
      unmeasured,
      `add these to the advance table in text-metrics.ts: ${unmeasured.join(", ")}`,
    ).toEqual([]);
  });

  it("carries no family the catalogue cannot pick", () => {
    // The other direction: a stale row is dead weight and usually means a
    // family was renamed on one side only.
    const catalogue = new Set(FONT_FAMILY_NAMES);
    const orphaned = MEASURED_FAMILIES.filter(
      (family) => !catalogue.has(family),
    ).sort();

    expect(orphaned, `stale rows in the advance table: ${orphaned.join(", ")}`)
      .toEqual([]);
  });

  it("scales linearly with font size", () => {
    expect(advanceWidth("Lumen", 68, 0, "Archivo")).toBeCloseTo(
      advanceWidth("Lumen", 34, 0, "Archivo") * 2,
      6,
    );
  });

  it("applies tracking between glyphs, not after the last one", () => {
    const tight = advanceWidth("ABCD", 10, -1, "Archivo");
    expect(tight).toBeCloseTo(advanceWidth("ABCD", 10, 0, "Archivo") - 3, 6);
  });

  it("is empty for empty input", () => {
    expect(advanceWidth("", 34, -0.5, "Archivo")).toBe(0);
  });

  it("falls back rather than dropping unknown characters", () => {
    // An accented name must still be measured, or its box collapses.
    expect(advanceWidth("Café", 34, 0, "Archivo")).toBeGreaterThan(
      advanceWidth("Caf", 34, 0, "Archivo"),
    );
  });
});

function context(name: string) {
  const brief = { ...BRIEF, name };
  const { strategy, palette, typography } = fallbackStrategy(brief);
  return buildSceneContext(
    brief.name,
    strategy.voice.tagline,
    fallbackMark(brief).markup,
    palette,
    typography,
  );
}

/**
 * Pull the lockup's fit transform and the mark's x offset out of a scene.
 *
 * The lockup sits in a <g> carrying a centred uniform-scale fit, then the mark
 * inside it carries its own translate. Both are `translate(...) scale(...)`, so
 * they are matched in document order: the fit comes first.
 */
function lockupGeometry(svg: string) {
  const transforms = [
    ...svg.matchAll(
      /<g transform="translate\(([-\d.]+), ?([-\d.]+)\) scale\(([\d.]+)\)"/g,
    ),
  ];
  if (transforms.length < 2) return null;

  const [fit, mark] = transforms;
  const scale = Number(fit[3]);

  return {
    // The fit maps the lockup box into the unit square, so the box is the
    // inverse of the scale along whichever axis is the constraining one.
    boxWidth: 1 / scale,
    fitX: Number(fit[1]),
    fitY: Number(fit[2]),
    scale,
    left: Number(mark[1]),
  };
}

const NAMES = [
  "Lumen Roasters",
  "WM",
  "Illinois Lithium",
  "Harbor & Field",
  "Atelier Frame",
];

describe("lockup centring", () => {
  const lockupScenes = PHOTO_SCENES.filter((s) => s.artwork === "lockup");

  it("has lockup scenes to check", () => {
    expect(lockupScenes.length).toBeGreaterThan(0);
  });

  it.each(NAMES)("centres %s inside its own box", (name) => {
    const ctx = context(name);
    for (const scene of lockupScenes) {
      const geo = lockupGeometry(renderPhotoScene(scene, ctx));
      expect(geo, `${scene.id} has no fitted lockup`).not.toBeNull();

      // Measured in the brand's own display face, which is what the renderer
      // set the box from.
      const contentWidth =
        64 + 18 + advanceWidth(name, 34, -0.5, ctx.displayFont);
      const right = geo!.boxWidth - (geo!.left + contentWidth);

      // Equal gutters either side is what keeps the artwork on the placement's
      // centre line; rounding the box to a whole unit allows half a unit.
      expect(
        Math.abs(geo!.left - right),
        `${scene.id} / ${name}: left ${geo!.left}, right ${right}`,
      ).toBeLessThan(1);
      expect(geo!.left).toBeGreaterThan(0);
    }
  });

  it("sits on the placement quad's centre, not just inside it", () => {
    for (const name of NAMES) {
      const ctx = context(name);
      for (const scene of lockupScenes) {
        const geo = lockupGeometry(renderPhotoScene(scene, ctx))!;

        // The lockup is wider than it is tall, so width is the constraining
        // axis: it spans the unit square edge to edge and is centred by the
        // vertical offset.
        const boxHeight = 72;
        expect(geo.fitX).toBeCloseTo(0, 4);
        expect(geo.fitY).toBeCloseTo((1 - boxHeight * geo.scale) / 2, 4);
      }
    }
  });

  it("uses a clipping-free <g>, so an under-measured name is not sheared", () => {
    // The width can only ever be estimated on the server. A nested <svg> would
    // establish a viewport and cut whatever the estimate missed; a <g> does not.
    const ctx = context("Wowzer Mammoth Wordmark");
    for (const scene of lockupScenes) {
      const svg = renderPhotoScene(scene, ctx);
      expect(svg).not.toContain("preserveAspectRatio=\"xMidYMid meet\"");
      expect(svg).not.toMatch(/<svg x="0" y="0" width="1" height="1"/);
    }
  });
});

describe("logo variants", () => {
  it.each(NAMES)("gives %s a horizontal lockup with even gutters", (name) => {
    const brief = { ...BRIEF, name };
    const { strategy, palette, typography } = fallbackStrategy(brief);
    void strategy;
    const variants = buildLogoVariants(
      brief,
      fallbackMark(brief),
      palette,
      typography,
    );

    const horizontal = variants.find((v) => v.id === "primary") ?? variants[0];
    const box = horizontal.svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const markX = horizontal.svg.match(
      /<g transform="translate\(([-\d.]+), [\d.]+\) scale/,
    );
    expect(box).not.toBeNull();

    if (markX) {
      const left = Number(markX[1]);
      const width = Number(box![1]);
      // 56 mark + 18 gap + the wordmark, at the composer's 30px display size.
      const display = typography.find((t) => t.role === "display") ?? typography[0];
      const tracking = display.letterSpacingEm * 30;
      const contentWidth =
        56 + 18 + advanceWidth(name, 30, tracking, display.stack);
      const right = width - (left + contentWidth);
      expect(Math.abs(left - right)).toBeLessThan(1);
    }
  });
});
