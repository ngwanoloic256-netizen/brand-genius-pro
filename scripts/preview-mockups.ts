/**
 * Renders every photo mockup to a PNG so placement can be checked by eye.
 *
 *   node scripts/preview-mockups.mjs
 *
 * Output goes to `.preview/` (git-ignored). This exists because a placement
 * quad is measured off a photograph — the only way to know it is right is to
 * look at the composite.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { PHOTO_SCENES, renderPhotoScene } from "../src/lib/ai/photo-scenes.ts";
import { buildSceneContext } from "../src/lib/ai/mockups.ts";
import { fallbackStrategy } from "../src/lib/ai/strategy.ts";
import { fallbackMark } from "../src/lib/ai/logo.ts";

const brief = {
  name: "Lumen Roasters",
  industry: "Specialty coffee roastery",
  keywords: "single-origin, transparent sourcing, slow craft",
};

const { strategy, palette, typography } = fallbackStrategy(brief);
const ctx = buildSceneContext(
  brief.name,
  strategy.voice.tagline,
  fallbackMark(brief).markup,
  palette,
  typography,
);

const outDir = fileURLToPath(new URL("../.preview/", import.meta.url));
await mkdir(outDir, { recursive: true });

for (const scene of PHOTO_SCENES) {
  const backplate = fileURLToPath(
    new URL(`../public/mockups/${scene.file}`, import.meta.url),
  );

  // librsvg will not fetch `/mockups/...`, so inline the backplate as a data
  // URI for the preview render only. The shipped SVG keeps the URL.
  const png = await sharp(await readFile(backplate)).png().toBuffer();
  const dataUri = `data:image/png;base64,${png.toString("base64")}`;

  const svg = renderPhotoScene(scene, ctx).replace(
    `/mockups/${scene.file}`,
    dataUri,
  );

  await sharp(Buffer.from(svg))
    .resize({ width: 900, withoutEnlargement: true })
    .png()
    .toFile(`${outDir}${scene.id}.png`);

  console.log(`${scene.id}`);
}

await writeFile(`${outDir}.gitignore`, "*\n");
console.log(`\n${PHOTO_SCENES.length} previews written to .preview/`);
