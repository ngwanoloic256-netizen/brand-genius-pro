/**
 * Web-sizes the generated BRAND GENIUS mockups for the landing page.
 *
 *   node scripts/optimize-brand-mockups.mjs
 *
 * The generator returns 4-6 MB PNGs. These are displayed as content rather than
 * exported anywhere, so they take WebP — the same call as the ambience art, and
 * for the same reason: nothing here has to survive jsPDF.
 *
 * The `*.png` sources stay out of git; only the WebP output is committed.
 */

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const DIR = new URL("../public/brand/mockups/", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);

const MAX_WIDTH = 1400;
const QUALITY = 76;

const files = (await readdir(DIR)).filter((f) => f.endsWith(".png"));

if (files.length === 0) {
  console.log("No .png mockups found in public/brand/mockups/");
  process.exit(0);
}

let before = 0;
let after = 0;

for (const file of files) {
  const source = join(DIR, file);
  const name = file.replace(/\.png$/, "");
  const target = join(DIR, `${name}.webp`);

  const input = sharp(source).rotate();
  const meta = await input.metadata();

  await input
    .resize({
      width: Math.min(MAX_WIDTH, meta.width ?? MAX_WIDTH),
      withoutEnlargement: true,
    })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(target);

  const from = (await stat(source)).size;
  const to = (await stat(target)).size;
  before += from;
  after += to;

  const outMeta = await sharp(target).metadata();
  console.log(
    `${name.padEnd(16)} ${String(outMeta.width).padStart(5)}x${String(outMeta.height).padEnd(5)}  ` +
      `${(from / 1e6).toFixed(2)} MB -> ${(to / 1e3).toFixed(0)} KB`,
  );
}

console.log(
  `\n${files.length} mockups: ${(before / 1e6).toFixed(2)} MB -> ${(after / 1e6).toFixed(2)} MB`,
);
