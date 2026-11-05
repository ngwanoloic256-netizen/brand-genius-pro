import { describe, expect, it } from "vitest";
import {
  ART_DIRECTIONS,
  NEUTRAL_PERSONALITY,
  baseSeed,
  brandSeed,
  inferPersonality,
  selectArtDirection,
} from "@/lib/ai/art-direction";
import { fallbackStrategy } from "@/lib/ai/strategy";
import { derivePalette, seedHue, SCALE_STEPS } from "@/lib/ai/palette";
import { contrastRatio, hexToOklch, oklchToHex } from "@/lib/color";
import { fontsForClass } from "@/lib/ai/fonts";
import { selectScenes } from "@/lib/ai/mockups";
import { migrateGuide, needsMigration } from "@/lib/guide-migration";
import { buildDemoGuide } from "@/lib/demo-store";
import type { BrandBrief } from "@/lib/types";

describe("art direction library", () => {
  it("has unique ids and covers every profile in the spec", () => {
    const ids = ART_DIRECTIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(10);
  });

  it("gives every profile type classes that exist and can fill their role", () => {
    for (const direction of ART_DIRECTIONS) {
      for (const role of ["display", "heading", "body", "data"] as const) {
        const candidates = fontsForClass(direction.type[role], role);
        expect(
          candidates.length,
          `${direction.id}: no ${role} font for class ${direction.type[role]}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("never sets two different families of the same class", () => {
    /*
     * Sharing a class across roles is legitimate — Swiss typography is one
     * grotesque at several sizes. Two *different* grotesques is the mush the
     * pairing rule forbids, so the invariant is on families, not classes.
     */
    for (const direction of ART_DIRECTIONS) {
      const { typography } = fallbackStrategy(
        { name: "Pairing Test", industry: "test", keywords: "test brand" },
        { artDirectionId: direction.id },
      );

      const familiesPerClass = new Map<string, Set<string>>();
      for (const style of typography) {
        const cls = direction.type[style.role];
        const set = familiesPerClass.get(cls) ?? new Set<string>();
        set.add(style.family);
        familiesPerClass.set(cls, set);
      }

      for (const [cls, families] of familiesPerClass) {
        expect(
          families.size,
          `${direction.id} uses ${[...families].join(" + ")} — two families of ${cls}`,
        ).toBe(1);
      }
    }
  });

  it("keeps the whole system to at most three families", () => {
    for (const direction of ART_DIRECTIONS) {
      const { typography } = fallbackStrategy(
        { name: "Count Test", industry: "test", keywords: "test brand" },
        { artDirectionId: direction.id },
      );
      const families = new Set(typography.map((t) => t.family));
      expect(families.size, `${direction.id} uses ${families.size} families`)
        .toBeLessThanOrEqual(3);
    }
  });

  it("keeps mockup prefer and avoid lists disjoint", () => {
    for (const direction of ART_DIRECTIONS) {
      const overlap = direction.mockup.prefer.filter((id) =>
        direction.mockup.avoid.includes(id),
      );
      expect(overlap, `${direction.id} both prefers and avoids ${overlap}`).toEqual([]);
    }
  });
});

describe("deterministic seed", () => {
  it("is stable for the same brand", () => {
    expect(baseSeed("Lumen Roasters", "food")).toBe(
      baseSeed("Lumen Roasters", "food"),
    );
    expect(brandSeed("Lumen", "food", "retro-vintage")).toBe(
      brandSeed("Lumen", "food", "retro-vintage"),
    );
  });

  it("differs across brands and across directions", () => {
    expect(baseSeed("Lumen", "food")).not.toBe(baseSeed("Verdant", "food"));
    expect(brandSeed("Lumen", "food", "retro-vintage")).not.toBe(
      brandSeed("Lumen", "food", "pop-ludique"),
    );
  });

  it("ignores casing and surrounding space in the name", () => {
    expect(baseSeed("  Lumen Roasters ", "food")).toBe(
      baseSeed("lumen roasters", "food"),
    );
  });
});

describe("art direction selection", () => {
  const brief = (name: string, sector: string, keywords = "") => ({
    name,
    sector,
    keywords,
  });

  it("is reproducible for the same brief", () => {
    const a = selectArtDirection(brief("Kova", "fintech", "fast, transparent"));
    const b = selectArtDirection(brief("Kova", "fintech", "fast, transparent"));
    expect(a.direction.id).toBe(b.direction.id);
    expect(a.seed).toBe(b.seed);
  });

  it("honours an explicit choice", () => {
    const result = selectArtDirection({
      ...brief("Kova", "fintech"),
      preferred: "brutaliste",
    });
    expect(result.direction.id).toBe("brutaliste");
  });

  it("picks a direction whose sectors include the brief's sector", () => {
    for (const sector of ["fintech", "food", "luxury", "health", "tech", "eco"]) {
      const { direction } = selectArtDirection(brief(`Test ${sector}`, sector));
      expect(
        direction.sectors.includes(sector),
        `${sector} got ${direction.id}, which does not serve it`,
      ).toBe(true);
    }
  });

  it("does not collapse to a safe middle when personality is neutral", () => {
    // The spec's anti-generic rule: a bland brief must still get a committed
    // direction, not the least offensive one.
    const { direction } = selectArtDirection({
      ...brief("Middling Co", "food"),
      personality: NEUTRAL_PERSONALITY,
    });

    const extremity =
      (Math.abs(direction.personality.seriousPlayful - 0.5) +
        Math.abs(direction.personality.classicModern - 0.5) +
        Math.abs(direction.personality.massPremium - 0.5) +
        Math.abs(direction.personality.quietLoud - 0.5)) /
      4;

    expect(extremity).toBeGreaterThan(0.12);
  });

  it("follows stated personality when one is given", () => {
    const premium = selectArtDirection({
      ...brief("Aurum", "luxury"),
      personality: {
        seriousPlayful: 0.1,
        classicModern: 0.5,
        massPremium: 0.95,
        quietLoud: 0.2,
      },
    });
    expect(premium.direction.personality.massPremium).toBeGreaterThan(0.7);

    const loud = selectArtDirection({
      ...brief("Blast", "sport"),
      personality: {
        seriousPlayful: 0.9,
        classicModern: 0.8,
        massPremium: 0.2,
        quietLoud: 0.95,
      },
    });
    expect(loud.direction.personality.quietLoud).toBeGreaterThan(0.6);
  });

  it("gives different brands in one sector room to diverge", () => {
    const names = ["Aurora", "Bexley", "Cinder", "Drift", "Ember", "Fathom", "Gable", "Hollow"];
    const chosen = new Set(
      names.map((n) => selectArtDirection(brief(n, "food")).direction.id),
    );
    expect(chosen.size).toBeGreaterThan(1);
  });

  it("reads personality out of the brief's own words", () => {
    expect(inferPersonality("bold, loud, energetic")?.quietLoud).toBeGreaterThan(0.6);
    expect(inferPersonality("quiet, understated luxury")?.massPremium).toBeGreaterThan(0.6);
    expect(inferPersonality("a shop")).toBeUndefined();
  });
});

describe("OKLCH palette derivation", () => {
  const direction = ART_DIRECTIONS[0];

  it("builds a monotonically darkening scale", () => {
    const { primaryScale } = derivePalette({
      base: "#2F6BFF",
      direction,
      seed: 1,
    });

    const lightness = SCALE_STEPS.map((s) => hexToOklch(primaryScale[s]).l);
    for (let i = 1; i < lightness.length; i++) {
      expect(lightness[i]).toBeLessThan(lightness[i - 1]);
    }
  });

  it("keeps every step inside the sRGB gamut", () => {
    const { primaryScale } = derivePalette({
      // A deliberately out-of-gamut request.
      base: "#00FF66",
      direction,
      seed: 1,
    });
    for (const step of SCALE_STEPS) {
      expect(primaryScale[step]).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("preserves hue when reducing chroma to reach the gamut", () => {
    // Clipping channels would drift the hue; walking chroma down must not.
    const wanted = { l: 0.62, c: 0.4, h: 150 };
    const got = hexToOklch(oklchToHex(wanted));
    expect(Math.abs(got.h - wanted.h)).toBeLessThan(6);
  });

  it("tints neutrals rather than leaving them pure grey", () => {
    const { swatches } = derivePalette({
      base: "#B4552D",
      direction: ART_DIRECTIONS.find((d) => d.id === "organique-artisanal")!,
      seed: 3,
    });

    const neutrals = swatches.filter((s) => s.role === "neutral");
    expect(neutrals.length).toBeGreaterThanOrEqual(3);
    // At least one neutral carries measurable chroma.
    expect(neutrals.some((n) => hexToOklch(n.hex).c > 0.002)).toBe(true);
  });

  it("produces every role", () => {
    const { swatches } = derivePalette({ base: "#12376B", direction, seed: 7 });
    for (const role of ["primary", "secondary", "accent", "neutral"] as const) {
      expect(swatches.some((s) => s.role === role), `missing ${role}`).toBe(true);
    }
  });

  it("reports contrast honestly", () => {
    const { contrastReport, swatches } = derivePalette({
      base: "#12376B",
      direction,
      seed: 7,
    });
    expect(contrastReport.length).toBeGreaterThan(0);

    const bodyCheck = contrastReport.find((c) => c.pair === "body text on paper");
    expect(bodyCheck).toBeDefined();
    // The reported ratio must match a real measurement, not a guess.
    const ink = [...swatches].reverse().find((s) => s.role === "neutral")!.hex;
    const paper = swatches.find((s) => s.role === "neutral")!.hex;
    expect(bodyCheck!.ratio).toBeCloseTo(contrastRatio(ink, paper), 1);
  });

  it("keeps body text legible on paper across every direction", () => {
    for (const d of ART_DIRECTIONS) {
      const { contrastReport } = derivePalette({
        base: seedHue("default", 1),
        direction: d,
        seed: 1,
      });
      const body = contrastReport.find((c) => c.pair === "body text on paper")!;
      expect(body.passes, `${d.id} body contrast is ${body.ratio}`).toBe(true);
    }
  });

  it("avoids blue seed hues for food brands", () => {
    // Blue suppresses appetite — the spec calls this out explicitly.
    for (let seed = 0; seed < 12; seed++) {
      const hue = hexToOklch(seedHue("food", seed)).h;
      expect(hue < 200 || hue > 260, `food seed landed on hue ${hue}`).toBe(true);
    }
  });
});

describe("direction drives the whole system", () => {
  const brief: BrandBrief = {
    name: "Kova",
    industry: "B2B payment platform",
    keywords: "fast, transparent, rigorous",
  };

  it("produces visibly different systems for different directions", () => {
    const swiss = fallbackStrategy(brief, { artDirectionId: "minimal-suisse" });
    const pop = fallbackStrategy(brief, { artDirectionId: "pop-ludique" });

    expect(swiss.strategy.artDirection.id).toBe("minimal-suisse");
    expect(pop.strategy.artDirection.id).toBe("pop-ludique");

    // Different type families, different palettes.
    const swissFamilies = swiss.typography.map((t) => t.family).join();
    const popFamilies = pop.typography.map((t) => t.family).join();
    expect(swissFamilies).not.toBe(popFamilies);

    expect(swiss.palette[0].hex).not.toBe(pop.palette[0].hex);

    // And a different modular scale, so the display size actually differs.
    const swissDisplay = swiss.typography.find((t) => t.role === "display")!;
    const popDisplay = pop.typography.find((t) => t.role === "display")!;
    expect(swissDisplay.sizePx).not.toBe(popDisplay.sizePx);
  });

  it("regenerates identically for an unchanged brief", () => {
    const a = fallbackStrategy(brief);
    const b = fallbackStrategy(brief);
    expect(a.strategy.seed).toBe(b.strategy.seed);
    expect(a.palette.map((s) => s.hex)).toEqual(b.palette.map((s) => s.hex));
    expect(a.typography.map((t) => t.family)).toEqual(
      b.typography.map((t) => t.family),
    );
  });

  it("gives four different sectors four different looks", () => {
    const briefs: BrandBrief[] = [
      { name: "Lumen Roasters", industry: "coffee roastery", keywords: "slow craft" },
      { name: "North Signal", industry: "analytics platform", keywords: "clarity, data" },
      { name: "Aurum", industry: "fine jewellery", keywords: "premium, exclusive" },
      { name: "Verdant", industry: "dental clinic", keywords: "calm, precise care" },
    ];

    const directions = briefs.map(
      (b) => fallbackStrategy(b).strategy.artDirection.id,
    );
    expect(new Set(directions).size).toBeGreaterThanOrEqual(3);
  });
});

describe("art direction constrains mockup selection", () => {
  it("keeps a profile's avoided surfaces out of the opening mockups", () => {
    const dark = ART_DIRECTIONS.find((d) => d.id === "premium-sombre")!;
    const ids = selectScenes("luxury", 6, dark).map((s) => s.id);

    for (const avoided of dark.mockup.avoid) {
      expect(ids.slice(0, 4), `${avoided} should not lead`).not.toContain(avoided);
    }
  });

  it("leads with the surfaces a profile prefers", () => {
    const artisanal = ART_DIRECTIONS.find((d) => d.id === "organique-artisanal")!;
    const ids = selectScenes("food", 4, artisanal).map((s) => s.id);
    const preferred = ids.filter((id) => artisanal.mockup.prefer.includes(id));
    expect(preferred.length).toBeGreaterThanOrEqual(2);
  });

  it("still honours the variety rule once the profile has reordered things", () => {
    for (const direction of ART_DIRECTIONS) {
      const scenes = selectScenes("default", 8, direction);
      const families = scenes.map((s) => s.family);

      expect(new Set(scenes.map((s) => s.id)).size).toBe(scenes.length);
      for (let i = 1; i < families.length; i++) {
        expect(
          families[i],
          `${direction.id}: ${families[i]} repeats at ${i}`,
        ).not.toBe(families[i - 1]);
      }
    }
  });
});

describe("legacy guide migration", () => {
  it("rebuilds a guide written before art direction existed", () => {
    const modern = fallbackStrategy({
      name: "Legacy Co",
      industry: "coffee roastery",
      keywords: "slow craft",
    });

    // A guide as an older release would have persisted it.
    const legacy = {
      brief: {
        name: "Legacy Co",
        industry: "coffee roastery",
        keywords: "slow craft",
      },
      strategy: {
        sector: "food",
        rationale: "old rationale",
        voice: modern.strategy.voice,
      },
      palette: modern.palette,
      typography: modern.typography,
      mark: { concept: "x", markup: "<circle r='5'/>", lockup: "horizontal" },
      logo: [],
      logoUsage: { clearSpaceRatio: 0.5, minWidthPx: 96, minWidthMm: 24, rules: [] },
      mockups: [],
      generatedAt: new Date().toISOString(),
    } as unknown as Parameters<typeof migrateGuide>[0];

    expect(needsMigration(legacy)).toBe(true);

    const migrated = migrateGuide(legacy);

    // The fields the UI reads must now exist.
    expect(migrated.strategy.artDirection).toBeDefined();
    expect(migrated.strategy.artDirection.radius).toBeTypeOf("number");
    expect(migrated.primaryScale).toBeDefined();
    expect(migrated.contrastReport.length).toBeGreaterThan(0);
    expect(migrated.quality).toBeDefined();

    // And what the customer already approved must be untouched.
    expect(migrated.palette).toEqual(modern.palette);
    expect(migrated.strategy.rationale).toBe("old rationale");
    expect(needsMigration(migrated)).toBe(false);
  });

  it("leaves a current guide alone", () => {
    const guide = buildDemoGuide({
      name: "Current Co",
      industry: "analytics platform",
      keywords: "clarity",
    });
    expect(needsMigration(guide)).toBe(false);
    expect(migrateGuide(guide)).toBe(guide);
  });
});
