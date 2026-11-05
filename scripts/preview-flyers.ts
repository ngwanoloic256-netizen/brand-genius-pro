/**
 * Renders one flyer per art direction so composition can be checked by eye.
 *
 *   npx vite-node scripts/preview-flyers.ts
 */
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { ART_DIRECTIONS } from "../src/lib/ai/art-direction.ts";
import { buildDemoGuide } from "../src/lib/demo-store.ts";
import { generateFlyers, checkFlyer } from "../src/lib/ai/flyer.ts";

const outDir = fileURLToPath(new URL("../.preview/flyers/", import.meta.url));
await mkdir(outDir, { recursive: true });

const guide = buildDemoGuide({
  name: "Lumen Roasters",
  industry: "Specialty coffee roastery",
  keywords: "single-origin, transparent sourcing, slow craft",
});

for (const direction of ART_DIRECTIONS) {
  const themed = {
    ...guide,
    strategy: { ...guide.strategy, artDirection: direction },
  };

  const [flyer] = generateFlyers(themed, { formats: ["a5"] });
  const failures = checkFlyer(flyer, themed).filter((c) => !c.passes);

  await sharp(Buffer.from(flyer.svg), { density: 200 })
    .resize({ width: 520 })
    .png()
    .toFile(`${outDir}${direction.id}.png`);

  console.log(
    `${direction.id.padEnd(26)} ${flyer.layout.padEnd(20)} ` +
      `${failures.length === 0 ? "ok" : "FAILS: " + failures.map((f) => f.label).join(", ")}`,
  );
}
