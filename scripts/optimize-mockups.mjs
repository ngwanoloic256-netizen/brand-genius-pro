/**
 * Converts the raw generated backplates into web-sized WebP.
 *
 * The generator returns ~5 MB PNGs at 2k. Shipping those would make the mockup
 * gallery unusable, so this reduces each to a bounded width and re-encodes as
 * WebP. Run once after generating new backplates:
 *
 *   node scripts/optimize-mockups.mjs
 *
 * The `raw-*.png` sources stay out of git (see .gitignore); only the WebP
 * output is committed.
 */

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const DIR = new URL("../public/mockups/", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);

const MAX_WIDTH = 1600;
const QUALITY = 80;

const files = (await readdir(DIR)).filter(
  (f) => f.startsWith("raw-") && f.endsWith(".png"),
);

if (files.length === 0) {
  console.log("No raw-*.png backplates found in public/mockups/");
  process.exit(0);
}

let before = 0;
let after = 0;

for (const file of files) {
  const source = join(DIR, file);
  const name = file.replace(/^raw-/, "").replace(/\.png$/, "");

  /*
   * JPEG rather than WebP, deliberately. These backplates have to survive two
   * export paths that WebP breaks: jsPDF only embeds JPEG and PNG, and the
   * canvas rasteriser inherits whatever the browser will decode inside an
   * <img>-loaded SVG. Backplates are photographs with no transparency, so JPEG
   * costs nothing but a few tens of kilobytes.
   */
  const target = join(DIR, `${name}.jpg`);

  const input = await sharp(source).rotate();
  const meta = await input.metadata();

  await input
    .resize({
      width: Math.min(MAX_WIDTH, meta.width ?? MAX_WIDTH),
      withoutEnlargement: true,
    })
    .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
    .toFile(target);

  const from = (await stat(source)).size;
  const to = (await stat(target)).size;
  before += from;
  after += to;

  const outMeta = await sharp(target).metadata();
  console.log(
    `${name.padEnd(12)} ${String(outMeta.width).padStart(5)}x${String(outMeta.height).padEnd(5)}  ` +
      `${(from / 1e6).toFixed(1)} MB -> ${(to / 1e3).toFixed(0)} KB`,
  );
}

console.log(
  `\n${files.length} backplates: ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(2)} MB`,
);
