import { describe, expect, it } from "vitest";
import { selectScenes, buildSceneContext, generateMockups } from "@/lib/ai/mockups";
import { fallbackStrategy, detectSector } from "@/lib/ai/strategy";
import { fallbackMark, buildLogoVariants } from "@/lib/ai/logo";
import { contrastRatio, rgbToCmyk, hexToRgb } from "@/lib/color";
import type { BrandBrief } from "@/lib/types";

const BRIEFS: BrandBrief[] = [
  {
    name: "Lumen Roasters",
    industry: "Specialty coffee roastery",
    keywords: "single-origin, transparent sourcing, slow craft",
  },
  {
    name: "North Signal",
    industry: "B2B analytics SaaS",
    keywords: "clarity, signal over noise, engineering rigour",
  },
  {
    name: "Verdant Clinic",
    industry: "Dental clinic",
    keywords: "calm, precise, unhurried care",
  },
  {
    name: "Atelier Frame",
    industry: "Independent design studio",
    keywords: "editorial, opinionated, craft-led",
  },
];

describe("mockup variety rule", () => {
  const sectors = ["food", "tech", "luxury", "health", "creative", "default"];

  it("never repeats a scene template inside one project", () => {
    for (const sector of sectors) {
      const ids = selectScenes(sector, 8).map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("never places two consecutive scenes from the same family", () => {
    for (const sector of sectors) {
      const families = selectScenes(sector, 8).map((s) => s.family);
      for (let i = 1; i < families.length; i++) {
        expect(
          families[i],
          `${sector}: ${families[i - 1]} repeated at index ${i}`,
        ).not.toBe(families[i - 1]);
      }
    }
  });

  it("covers at least four composition families in a set of eight", () => {
    for (const sector of sectors) {
      const families = new Set(selectScenes(sector, 8).map((s) => s.family));
      expect(families.size).toBeGreaterThanOrEqual(4);
    }
  });

  // Asserted by support type rather than scene id: swapping a drawn cup for a
  // photographed one must not fail the test, but dropping cups from a coffee
  // brand's opening mockups must.
  it.each([
    ["food", /cup|pouch|storefront/],
    ["tech", /phone|laptop|screen/],
    ["health", /reception|stationery|storefront/],
    ["luxury", /box|bottle/],
  ])("leads %s with a relevant support", (sector, pattern) => {
    const opening = selectScenes(sector, 3).map((s) => s.id);
    expect(opening.some((id) => pattern.test(id))).toBe(true);
  });

  it("degrades gracefully when more mockups are requested than scenes exist", () => {
    const scenes = selectScenes("default", 99);
    expect(scenes.length).toBeGreaterThan(8);
    expect(new Set(scenes.map((s) => s.id)).size).toBe(scenes.length);
  });
});

describe("palette construction", () => {
  it("always produces every semantic role", () => {
    for (const brief of BRIEFS) {
      const roles = new Set(fallbackStrategy(brief).palette.map((s) => s.role));
      for (const role of ["primary", "secondary", "accent", "neutral"]) {
        expect(roles.has(role as never), `${brief.name} is missing ${role}`).toBe(
          true,
        );
      }
    }
  });

  it("derives print codes that match the hex", () => {
    for (const brief of BRIEFS) {
      for (const swatch of fallbackStrategy(brief).palette) {
        expect(swatch.rgb).toEqual(hexToRgb(swatch.hex));
        expect(swatch.cmyk).toEqual(rgbToCmyk(swatch.rgb));
      }
    }
  });

  it("gives every swatch a foreground that clears WCAG AA for large text", () => {
    for (const brief of BRIEFS) {
      for (const swatch of fallbackStrategy(brief).palette) {
        expect(
          contrastRatio(swatch.hex, swatch.onColor),
          `${brief.name} / ${swatch.name}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("produces a different primary for different briefs", () => {
    const primaries = BRIEFS.map(
      (brief) =>
        fallbackStrategy(brief).palette.find((s) => s.role === "primary")!.hex,
    );
    expect(new Set(primaries).size).toBe(primaries.length);
  });
});

/** Elements the lockup composer and scene renderers are allowed to emit. */
const ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "rect",
  "polygon",
  "polyline",
  "ellipse",
  "line",
  "text",
  "tspan",
  "defs",
  "filter",
  "fedropshadow",
  "lineargradient",
  "stop",
  "clippath",
]);

describe("logo system", () => {
  it("composes five variants covering light, dark, and single-colour use", () => {
    const brief = BRIEFS[0];
    const { palette, typography } = fallbackStrategy(brief);
    const variants = buildLogoVariants(
      brief,
      fallbackMark(brief),
      palette,
      typography,
    );

    expect(variants).toHaveLength(5);
    expect(variants.map((v) => v.id).sort()).toEqual([
      "horizontal",
      "icon",
      "inverted",
      "monochrome",
      "primary",
    ]);
    expect(variants.some((v) => v.background === "dark")).toBe(true);
  });

  it("emits standalone SVG with no leftover colour placeholders", () => {
    const brief = BRIEFS[1];
    const { palette, typography } = fallbackStrategy(brief);
    const variants = buildLogoVariants(
      brief,
      fallbackMark(brief),
      palette,
      typography,
    );

    for (const variant of variants) {
      expect(variant.svg).toMatch(/^<svg /);
      expect(variant.svg).toContain("xmlns=");
      expect(variant.svg).not.toContain("{{MARK}}");
      expect(variant.svg).not.toContain("{{ACCENT}}");
    }
  });

  it("escapes brand names containing markup characters", () => {
    const brief: BrandBrief = {
      name: '<img src=x onerror="alert(1)">',
      industry: "Test",
      keywords: "test brand",
    };
    const { palette, typography } = fallbackStrategy(brief);
    const variants = buildLogoVariants(
      brief,
      fallbackMark(brief),
      palette,
      typography,
    );

    for (const variant of variants) {
      // The payload may appear as inert text — what must never happen is it
      // arriving as real markup, so assert on the delimiters, not the string.
      expect(variant.svg).not.toContain("<img");
      expect(variant.svg).toContain("&lt;img");
      expect(variant.svg).toContain("&quot;alert(1)&quot;");

      // Every element in the output is one we emitted ourselves.
      const tags = [...variant.svg.matchAll(/<\/?([a-zA-Z][\w:-]*)/g)].map(
        (m) => m[1].toLowerCase(),
      );
      expect(new Set(tags)).toEqual(
        new Set(tags.filter((t) => ALLOWED_TAGS.has(t))),
      );
    }
  });
});

describe("mockup rendering", () => {
  it("renders well-formed, brand-coloured scenes with no placeholders left", () => {
    const brief = BRIEFS[0];
    const { strategy, palette, typography } = fallbackStrategy(brief);
    const mark = fallbackMark(brief);
    const ctx = buildSceneContext(
      brief.name,
      strategy.voice.tagline,
      mark.markup,
      palette,
      typography,
    );

    const mockups = generateMockups(ctx, strategy.sector, 8);
    expect(mockups).toHaveLength(8);

    for (const mockup of mockups) {
      expect(mockup.svg).toMatch(/^<svg /);
      expect(mockup.svg).toContain("viewBox=");
      expect(mockup.svg).toContain("</svg>");
      expect(mockup.svg).not.toContain("{{MARK}}");
      expect(mockup.svg).not.toContain("{{ACCENT}}");
    }
  });

  it("escapes brand names so a scene cannot be broken out of", () => {
    const brief: BrandBrief = {
      name: '"><script>alert(1)</script>',
      industry: "Test",
      keywords: "test brand",
    };
    const { strategy, palette, typography } = fallbackStrategy(brief);
    const ctx = buildSceneContext(
      brief.name,
      strategy.voice.tagline,
      fallbackMark(brief).markup,
      palette,
      typography,
    );

    for (const mockup of generateMockups(ctx, strategy.sector, 8)) {
      expect(mockup.svg).not.toContain("<script>");
    }
  });
});

describe("sector detection", () => {
  it.each([
    ["A neighbourhood café and bakery", "food"],
    ["Cloud data platform for dev teams", "tech"],
    ["Haute couture atelier", "luxury"],
    ["Family dental clinic", "health"],
    ["Brand design studio", "creative"],
    ["B2B payment and credit platform", "fintech"],
    ["Corporate law firm", "legal"],
    ["Sustainable packaging supplier", "eco"],
    ["Municipal waste logistics", "industry"],
    ["A shop that sells small nameless objects", "default"],
  ])("maps %s to %s", (text, expected) => {
    expect(detectSector(text)).toBe(expected);
  });
});
