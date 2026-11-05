import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contrastRatio, mix } from "@/lib/color";

/**
 * The interface palette, held to the standard the product sells.
 *
 * BRAND GENIUS ships a contrast report with every guide it generates, so its
 * own tokens failing AA is the one bug it cannot afford. Two shipped already
 * had: `ink-faint` sat at 2.63:1 under 10px labels, and white on the accent
 * measured exactly 4.50:1. Both were found by measuring the rendered page
 * rather than by reading the CSS, which is why this file exists — it reads the
 * real token values out of `globals.css` so the check cannot drift from what
 * the browser actually paints.
 *
 * The thresholds are WCAG 2.1 AA: 4.5:1 for body text, 3:1 for large text
 * (>=24px, or >=18.66px bold) and for non-text contours.
 */

const CSS = readFileSync(join(__dirname, "../src/app/globals.css"), "utf8");

function token(name: string): string {
  const match = CSS.match(
    new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`),
  );
  if (!match) throw new Error(`token --color-${name} not found in globals.css`);
  return match[1];
}

const WHITE = "#ffffff";
const BODY = 4.5;
const LARGE = 3;

describe("interface tokens", () => {
  describe("neutral ramp on white", () => {
    const cases: Array<[string, number]> = [
      ["ink", BODY],
      ["ink-soft", BODY],
      ["ink-muted", BODY],
      // Documented as large-text and non-text only, so it is held to 3:1.
      ["ink-faint", LARGE],
    ];

    it.each(cases)("%s clears %s:1", (name, floor) => {
      expect(contrastRatio(token(name), WHITE)).toBeGreaterThanOrEqual(floor);
    });

    it("steps downward, so the ramp keeps its order", () => {
      const ratios = ["ink", "ink-soft", "ink-muted", "ink-faint"].map((n) =>
        contrastRatio(token(n), WHITE),
      );
      for (let i = 1; i < ratios.length; i += 1) {
        expect(ratios[i]).toBeLessThan(ratios[i - 1]);
      }
    });
  });

  describe("accent", () => {
    it("carries a white label both ways", () => {
      // Every primary button in the app is this pairing.
      expect(
        contrastRatio(token("on-accent"), token("acid")),
      ).toBeGreaterThanOrEqual(BODY);
      expect(contrastRatio(token("acid"), WHITE)).toBeGreaterThanOrEqual(BODY);
    });

    it("accent-soft is legible on the ink surfaces it is made for", () => {
      // `acid` is tuned for white grounds and measures 2.85:1 on ink, which is
      // why the dark sections use this token instead.
      expect(
        contrastRatio(token("accent-soft"), token("ink")),
      ).toBeGreaterThanOrEqual(BODY);
    });
  });

  describe("semantic pair", () => {
    // Base = icons, borders and fills (3:1). `-deep` = words (4.5:1), checked
    // against the /12 badge tint the labels actually sit on, not bare white.
    it.each(["signal", "positive"])("%s base clears the non-text floor", (n) => {
      expect(contrastRatio(token(n), WHITE)).toBeGreaterThanOrEqual(LARGE);
    });

    it.each(["signal", "positive"])("%s-deep carries a label", (n) => {
      const tint = mix(WHITE, token(n), 0.12);
      expect(contrastRatio(token(`${n}-deep`), WHITE)).toBeGreaterThanOrEqual(
        BODY,
      );
      expect(contrastRatio(token(`${n}-deep`), tint)).toBeGreaterThanOrEqual(
        BODY,
      );
    });
  });

  describe("white text on the ink surfaces", () => {
    // The dark sections set body copy in white at reduced alpha. 45% measured
    // 4.28:1 and failed; these are the alphas the app is allowed to use.
    it.each([0.55, 0.6, 0.65, 0.8])("white/%s clears AA on ink", (alpha) => {
      const flat = mix(token("ink"), WHITE, alpha);
      expect(contrastRatio(flat, token("ink"))).toBeGreaterThanOrEqual(BODY);
    });

    it("rejects the alpha that was failing, so the floor is real", () => {
      const flat = mix(token("ink"), WHITE, 0.45);
      expect(contrastRatio(flat, token("ink"))).toBeLessThan(BODY);
    });
  });
});
