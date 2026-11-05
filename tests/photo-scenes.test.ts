import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PHOTO_SCENES, renderPhotoScene } from "@/lib/ai/photo-scenes";
import { buildSceneContext } from "@/lib/ai/mockups";
import { fallbackStrategy } from "@/lib/ai/strategy";
import { fallbackMark } from "@/lib/ai/logo";
import type { BrandBrief } from "@/lib/types";

const BRIEF: BrandBrief = {
  name: "Lumen Roasters",
  industry: "Specialty coffee roastery",
  keywords: "single-origin, transparent sourcing, slow craft",
};

function context(name = BRIEF.name) {
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

describe("photo backplates", () => {
  it("ships every backplate the scenes reference", () => {
    for (const scene of PHOTO_SCENES) {
      const path = fileURLToPath(
        new URL(`../public/mockups/${scene.file}`, import.meta.url),
      );
      expect(existsSync(path), `missing backplate: ${scene.file}`).toBe(true);
    }
  });

  it("keeps every placement quad inside the image", () => {
    for (const { id, placement: p } of PHOTO_SCENES) {
      // All four corners of the quad must land within the frame.
      const corners = [
        [p.ox, p.oy],
        [p.ox + p.ux, p.oy + p.uy],
        [p.ox + p.vx, p.oy + p.vy],
        [p.ox + p.ux + p.vx, p.oy + p.uy + p.vy],
      ];
      for (const [x, y] of corners) {
        expect(x, `${id} x out of frame`).toBeGreaterThanOrEqual(0);
        expect(x, `${id} x out of frame`).toBeLessThanOrEqual(1);
        expect(y, `${id} y out of frame`).toBeGreaterThanOrEqual(0);
        expect(y, `${id} y out of frame`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("gives every placement a non-degenerate area", () => {
    for (const { id, placement: p } of PHOTO_SCENES) {
      // Cross product of the two edge vectors — zero means a collapsed quad.
      const area = Math.abs(p.ux * p.vy - p.uy * p.vx);
      expect(area, `${id} has a collapsed placement`).toBeGreaterThan(0.002);
    }
  });

  it("uses unique scene ids", () => {
    const ids = PHOTO_SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("photo scene rendering", () => {
  it("produces well-formed SVG referencing the backplate", () => {
    const ctx = context();
    for (const scene of PHOTO_SCENES) {
      const svg = renderPhotoScene(scene, ctx);
      expect(svg).toMatch(/^<svg /);
      expect(svg).toContain("</svg>");
      expect(svg).toContain(`/mockups/${scene.file}`);
      expect(svg).toContain(`viewBox="0 0 ${scene.width} ${scene.height}"`);
    }
  });

  it("leaves no colour placeholders in the output", () => {
    const ctx = context();
    for (const scene of PHOTO_SCENES) {
      const svg = renderPhotoScene(scene, ctx);
      expect(svg).not.toContain("{{MARK}}");
      expect(svg).not.toContain("{{ACCENT}}");
    }
  });

  it("emits a finite placement matrix", () => {
    const ctx = context();
    for (const scene of PHOTO_SCENES) {
      const matrix = renderPhotoScene(scene, ctx).match(
        /matrix\(([^)]+)\)/,
      )?.[1];
      expect(matrix, `${scene.id} has no matrix`).toBeTruthy();
      for (const value of matrix!.split(/\s+/)) {
        expect(Number.isFinite(Number(value))).toBe(true);
      }
    }
  });

  it("escapes brand names containing markup characters", () => {
    const ctx = context('"><script>alert(1)</script>');
    for (const scene of PHOTO_SCENES) {
      const svg = renderPhotoScene(scene, ctx);
      expect(svg).not.toContain("<script>");
      expect(svg).toContain("&lt;script&gt;");
    }
  });

  it("fits long brand names without distorting the lockup", () => {
    const ctx = context("A Very Long Artisanal Brand Name Indeed");
    for (const scene of PHOTO_SCENES) {
      const svg = renderPhotoScene(scene, ctx);

      // The lockup is fitted with a single uniform scale. Two different scale
      // arguments would squash a long wordmark to fit the placement quad,
      // which is exactly what this guards against.
      const fit = svg.match(
        /<g transform="translate\([-\d.]+, [-\d.]+\) scale\(([\d.]+)\)">/,
      );
      expect(fit, `${scene.id} has no fitted lockup`).not.toBeNull();
      expect(Number(fit![1])).toBeGreaterThan(0);

      // And it is a <g>, not a nested <svg>: no viewport, so nothing clips.
      expect(svg).not.toContain('preserveAspectRatio="xMidYMid meet"');
    }
  });
});
