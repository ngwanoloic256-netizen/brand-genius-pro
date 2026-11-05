/**
 * Converts the raw generated ambience art into web-sized WebP.
 *
 *   node scripts/optimize-ambience.mjs
 *
 * WebP here, JPEG for the mockup backplates, and the difference is not a whim.
 * A backplate has to survive jsPDF (which embeds only JPEG and PNG) and the
 * canvas rasteriser that loads an SVG through <img>. These images do neither:
 * they are CSS backgrounds on the marketing page and nothing exports them, so
 * they can take the format that is simply smaller.
 *
 * The `raw-*.png` sources stay out of git; only the WebP output is committed.
 */

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// Defaults to the marketing ambience; pass a folder under public/ to reuse it.
const FOLDER = process.argv[2] ?? "ambience";
const DIR = new URL(`../public/${FOLDER}/`, import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);

const MAX_WIDTH = 1920;
const QUALITY = 72;

const files = (await readdir(DIR)).filter(
  (f) => f.startsWith("raw-") && f.endsWith(".png"),
);

if (files.length === 0) {
  console.log("No raw-*.png ambience art found in public/ambience/");
  process.exit(0);
}

let before = 0;
let after = 0;

for (const file of files) {
  const source = join(DIR, file);
  const name = file.replace(/^raw-/, "").replace(/\.png$/, "");
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
    `${name.padEnd(12)} ${String(outMeta.width).padStart(5)}x${String(outMeta.height).padEnd(5)}  ` +
      `${(from / 1e6).toFixed(2)} MB -> ${(to / 1e3).toFixed(0)} KB`,
  );
}

console.log(
  `\n${files.length} images: ${(before / 1e6).toFixed(2)} MB -> ${(after / 1e6).toFixed(2)} MB`,
);
