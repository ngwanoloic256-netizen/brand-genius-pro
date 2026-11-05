/**
 * Runs the product's own OKLCH engine over the product's own brand colours.
 *
 *   npx vite-node scripts/ramp-check.ts
 *
 * BRAND GENIUS ships perceptually-even tonal ramps to its customers while its
 * own interface palette was hand-picked and uneven. This prints the ramp the
 * engine produces so the CSS tokens can be replaced with it.
 */
import { buildScale, SCALE_STEPS } from "../src/lib/ai/palette.ts";
import { hexToOklch, contrastRatio } from "../src/lib/color.ts";

function report(label: string, seed: string, ceiling: number) {
  const scale = buildScale(hexToOklch(seed), ceiling);
  console.log(`\n=== ${label} (seed ${seed}) ===`);
  console.log("step   hex       L      on-white");

  let previous: number | null = null;
  for (const step of SCALE_STEPS) {
    const hex = scale[step];
    const { l } = hexToOklch(hex);
    const delta = previous === null ? "" : ` Δ${(previous - l).toFixed(3)}`;
    previous = l;
    console.log(
      `${String(step).padEnd(6)} ${hex}  ${l.toFixed(3)}  ` +
        `${contrastRatio(hex, "#FFFFFF").toFixed(2)}${delta}`,
    );
  }
  return scale;
}

const navy = report("Navy", "#14315C", 0.1);
const accent = report("Accent", "#2F6BFF", 0.18);

console.log("\n--- proposed token mapping ---");
console.log(`ink/base       ${navy[950]}`);
console.log(`ink/soft       ${navy[800]}`);
console.log(`ink/muted      ${navy[600]}`);
console.log(`ink/faint      ${navy[400]}`);
console.log(`line/default   ${navy[200]}`);
console.log(`line/soft      ${navy[100]}`);
console.log(`surface/sunken ${navy[50]}`);
console.log(`accent/default ${accent[600]}`);
console.log(`accent/pressed ${accent[700]}`);
console.log(`accent/soft    ${accent[300]}`);

console.log("\n--- contrast gates ---");
const checks: Array<[string, string, string, number]> = [
  ["body on paper", navy[950], "#FFFFFF", 4.5],
  ["muted on paper", navy[600], "#FFFFFF", 4.5],
  ["faint on paper", navy[400], "#FFFFFF", 3],
  ["accent on paper", accent[600], "#FFFFFF", 3],
  ["white on accent", "#FFFFFF", accent[600], 4.5],
  ["accent-soft on ink", accent[300], navy[950], 4.5],
];

for (const [label, a, b, threshold] of checks) {
  const ratio = contrastRatio(a, b);
  console.log(
    `${label.padEnd(20)} ${ratio.toFixed(2)}  ${ratio >= threshold ? "pass" : "FAIL"} (needs ${threshold})`,
  );
}

console.log("\n--- current shipped tokens, measured ---");
const current: Array<[string, string, string, number]> = [
  ["ink #0A1A33 on white", "#0A1A33", "#FFFFFF", 4.5],
  ["ink-muted #566D90 on white", "#566D90", "#FFFFFF", 4.5],
  ["ink-faint #8EA1BD on white", "#8EA1BD", "#FFFFFF", 3],
  ["accent #2F6BFF on white", "#2F6BFF", "#FFFFFF", 3],
  ["WHITE LABEL on accent #2F6BFF", "#FFFFFF", "#2F6BFF", 4.5],
];
for (const [label, a, b, threshold] of current) {
  const ratio = contrastRatio(a, b);
  console.log(
    `${label.padEnd(34)} ${ratio.toFixed(2)}  ${ratio >= threshold ? "pass" : "FAIL"} (needs ${threshold})`,
  );
}
console.log("\nnavy 500 for ink/faint:", navy[500], contrastRatio(navy[500], "#FFFFFF").toFixed(2));
