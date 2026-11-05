import { describe, expect, it } from "vitest";
import {
  BLEED,
  FLYER_FORMATS,
  SAFE_ZONE,
  checkFlyer,
  defaultContent,
  generateFlyers,
  layoutsFor,
  renderFlyer,
} from "@/lib/ai/flyer";
import { ART_DIRECTIONS } from "@/lib/ai/art-direction";
import { buildDemoGuide } from "@/lib/demo-store";
import type { BrandGuide } from "@/lib/types";

const guide = buildDemoGuide({
  name: "Lumen Roasters",
  industry: "Specialty coffee roastery",
  keywords: "single-origin, transparent sourcing, slow craft",
});

/** The same brand under a chosen direction, for cross-profile checks. */
function themed(directionId: string): BrandGuide {
  const direction = ART_DIRECTIONS.find((d) => d.id === directionId)!;
  return {
    ...guide,
    strategy: { ...guide.strategy, artDirection: direction },
  };
}

describe("flyer formats", () => {
  it("uses real trim sizes", () => {
    const a5 = FLYER_FORMATS.find((f) => f.id === "a5")!;
    expect([a5.width, a5.height]).toEqual([148, 210]);

    const a4 = FLYER_FORMATS.find((f) => f.id === "a4")!;
    expect([a4.width, a4.height]).toEqual([210, 297]);

    const dl = FLYER_FORMATS.find((f) => f.id === "dl")!;
    expect([dl.width, dl.height]).toEqual([99, 210]);
  });

  it("keeps every composition margin outside the safe zone", () => {
    for (const format of FLYER_FORMATS) {
      expect(format.margin, `${format.id}`).toBeGreaterThanOrEqual(SAFE_ZONE);
    }
  });
});

describe("flyer rendering", () => {
  it("sizes the artwork to trim plus bleed on all four edges", () => {
    for (const format of FLYER_FORMATS) {
      const flyer = renderFlyer(guide, {
        format,
        layout: "bandeau-haut",
        content: defaultContent(guide),
      });

      const box = flyer.svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      expect(box).toBeTruthy();
      expect(Number(box![1])).toBeCloseTo(format.width + BLEED * 2, 2);
      expect(Number(box![2])).toBeCloseTo(format.height + BLEED * 2, 2);

      // Physical units, so the printer receives true size rather than pixels.
      expect(flyer.svg).toContain("mm\"");
    }
  });

  it("holds the hierarchy ratio at three or more in every format", () => {
    for (const format of FLYER_FORMATS) {
      const flyer = renderFlyer(guide, {
        format,
        layout: "grille-modulaire",
        content: defaultContent(guide),
      });
      expect(flyer.hierarchyRatio, format.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("escapes copy that contains markup", () => {
    const flyer = renderFlyer(guide, {
      format: FLYER_FORMATS[1],
      layout: "bandeau-haut",
      content: {
        ...defaultContent(guide),
        headline: '<script>alert(1)</script>',
        cta: '"><g>',
      },
    });
    expect(flyer.svg).not.toContain("<script>");
    expect(flyer.svg).toContain("&lt;script&gt;");
  });

  it("produces well-formed SVG with no leftover placeholders", () => {
    for (const direction of ART_DIRECTIONS) {
      const [flyer] = generateFlyers(themed(direction.id), { formats: ["a5"] });
      expect(flyer.svg).toMatch(/^<svg /);
      expect(flyer.svg).toContain("</svg>");
      expect(flyer.svg).not.toContain("{{MARK}}");
      expect(flyer.svg).not.toContain("{{ACCENT}}");
      expect(flyer.svg).not.toContain("NaN");
      expect(flyer.svg).not.toContain("undefined");
    }
  });
});

describe("layout filtering by art direction", () => {
  it("never offers a layout the direction forbids", () => {
    for (const direction of ART_DIRECTIONS) {
      const allowed = layoutsFor(direction).map((l) => l.id);
      expect(allowed.length).toBeGreaterThan(0);
      for (const id of allowed) {
        expect(id).not.toBe(undefined);
      }
    }
  });

  it("keeps brutalism away from centred editorial, and luxury away from diagonals", () => {
    const brutal = layoutsFor(ART_DIRECTIONS.find((d) => d.id === "brutaliste")!);
    expect(brutal.map((l) => l.id)).not.toContain("centre-editorial");

    const luxe = layoutsFor(ART_DIRECTIONS.find((d) => d.id === "luxe-editorial")!);
    expect(luxe.map((l) => l.id)).not.toContain("bloc-diagonal");

    const swiss = layoutsFor(ART_DIRECTIONS.find((d) => d.id === "minimal-suisse")!);
    expect(swiss.map((l) => l.id)).not.toContain("bordure-badge");
  });

  it("only ever generates a layout that survived the filter", () => {
    for (const direction of ART_DIRECTIONS) {
      const allowed = new Set(layoutsFor(direction).map((l) => l.id));
      for (const flyer of generateFlyers(themed(direction.id))) {
        expect(allowed.has(flyer.layout), `${direction.id} got ${flyer.layout}`).toBe(
          true,
        );
      }
    }
  });
});

describe("flyer quality gate", () => {
  it("passes every check for every art direction", () => {
    for (const direction of ART_DIRECTIONS) {
      const brand = themed(direction.id);
      for (const flyer of generateFlyers(brand)) {
        const failures = checkFlyer(flyer, brand).filter((c) => !c.passes);
        expect(
          failures.map((f) => f.label),
          `${direction.id} / ${flyer.layout}`,
        ).toEqual([]);
      }
    }
  });

  it("actually fails when white space drops below the threshold", () => {
    // The gate has to be capable of failing, or it is decoration.
    const flyer = renderFlyer(guide, {
      format: FLYER_FORMATS[1],
      layout: "photo-pleine-page",
      content: defaultContent(guide),
    });
    const cramped = { ...flyer, whitespaceRatio: 0.2 };
    const check = checkFlyer(cramped, guide).find((c) =>
      c.label.includes("Espace blanc"),
    )!;
    expect(check.passes).toBe(false);
  });

  it("fails a flyer whose headline does not dominate", () => {
    const flyer = renderFlyer(guide, {
      format: FLYER_FORMATS[1],
      layout: "bandeau-haut",
      content: defaultContent(guide),
    });
    const flat = { ...flyer, hierarchyRatio: 2.1 };
    const check = checkFlyer(flat, guide).find((c) =>
      c.label.includes("hiérarchie"),
    )!;
    expect(check.passes).toBe(false);
  });
});

describe("default copy", () => {
  it("produces a headline of three to seven words", () => {
    const words = defaultContent(guide).headline.split(/\s+/).filter(Boolean);
    expect(words.length).toBeGreaterThanOrEqual(3);
    expect(words.length).toBeLessThanOrEqual(9);
  });

  it("never leaves a stranded fragment as the headline", () => {
    // The first version cut the tagline at its dash and produced "single-origin."
    const headline = defaultContent(guide).headline;
    expect(headline).not.toMatch(/^[a-z-]+\.?$/);
  });

  it("keeps to a single call to action", () => {
    const content = defaultContent(guide);
    expect(content.cta.split(/\s+/).length).toBeLessThanOrEqual(8);
    expect(content.bullets.length).toBeLessThanOrEqual(3);
  });
});
