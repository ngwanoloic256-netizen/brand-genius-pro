/**
 * Curated Google Fonts catalogue, indexed by typographic class.
 *
 * Art direction profiles choose type by *class* rather than by family name —
 * "this brand needs a didone display over a humanist body" — so every entry
 * carries the class that decides whether a profile may reach for it. Pairing by
 * class is also what enforces the rule that two families from the same class
 * never sit together: two geometric sans read as one mushy voice.
 *
 * Every family here is on Google Fonts. That is load-bearing: the guide hands
 * the client a `fonts.googleapis.com` URL, so a family that only exists on
 * another foundry would produce a link that silently 404s.
 */

export type TypeClass =
  | "grotesque-neutral"
  | "grotesque-contemporary"
  | "grotesque-condensed"
  | "geometric"
  | "humanist"
  | "serif-transitional"
  | "didone"
  | "serif-soft"
  | "slab"
  | "mono"
  | "display"
  | "script";

export interface FontEntry {
  family: string;
  class: TypeClass;
  weights: number[];
  /** Roles this family is suitable for. */
  roles: Array<"display" | "heading" | "body" | "data">;
}

export const FONT_CATALOGUE: FontEntry[] = [
  // Grotesque — neutral (Swiss rigour)
  { family: "Archivo", class: "grotesque-neutral", weights: [400, 500, 600, 700], roles: ["display", "heading", "body"] },
  { family: "Inter", class: "grotesque-neutral", weights: [400, 500, 600, 700], roles: ["heading", "body"] },
  { family: "Roboto", class: "grotesque-neutral", weights: [400, 500, 700], roles: ["body"] },

  // Grotesque — contemporary (modern, confident)
  { family: "Manrope", class: "grotesque-contemporary", weights: [400, 500, 600, 800], roles: ["display", "heading", "body"] },
  { family: "Plus Jakarta Sans", class: "grotesque-contemporary", weights: [400, 500, 600, 800], roles: ["display", "heading", "body"] },
  { family: "Space Grotesk", class: "grotesque-contemporary", weights: [400, 500, 600, 700], roles: ["display", "heading"] },

  // Grotesque — condensed (brutalist, poster)
  { family: "Archivo Narrow", class: "grotesque-condensed", weights: [400, 500, 600, 700], roles: ["display", "heading"] },
  { family: "Oswald", class: "grotesque-condensed", weights: [400, 500, 600, 700], roles: ["display", "heading"] },

  // Geometric (rational, clean, a little cold)
  { family: "Outfit", class: "geometric", weights: [300, 400, 500, 600, 700], roles: ["display", "heading", "body"] },
  { family: "Sora", class: "geometric", weights: [400, 500, 600, 700], roles: ["display", "heading"] },
  { family: "DM Sans", class: "geometric", weights: [400, 500, 700], roles: ["heading", "body"] },
  { family: "Poppins", class: "geometric", weights: [400, 500, 600, 700], roles: ["display", "heading"] },

  // Humanist (warm, accessible)
  { family: "Work Sans", class: "humanist", weights: [400, 500, 600, 700], roles: ["display", "heading", "body"] },
  { family: "Figtree", class: "humanist", weights: [400, 500, 600, 700], roles: ["display", "heading", "body"] },
  { family: "Source Sans 3", class: "humanist", weights: [400, 600, 700], roles: ["body"] },
  { family: "Nunito Sans", class: "humanist", weights: [400, 600, 700], roles: ["heading", "body"] },

  // Serif — transitional (credibility, heritage)
  { family: "Source Serif 4", class: "serif-transitional", weights: [400, 600, 700], roles: ["display", "heading", "body"] },
  { family: "Lora", class: "serif-transitional", weights: [400, 500, 600, 700], roles: ["heading", "body"] },
  { family: "Libre Baskerville", class: "serif-transitional", weights: [400, 700], roles: ["display", "heading", "body"] },
  { family: "Newsreader", class: "serif-transitional", weights: [400, 500, 600], roles: ["heading", "body"] },

  // Didone (luxury, fashion, editorial)
  { family: "Playfair Display", class: "didone", weights: [400, 500, 600, 700], roles: ["display", "heading"] },
  { family: "Bodoni Moda", class: "didone", weights: [400, 500, 600, 700], roles: ["display", "heading"] },
  { family: "Instrument Serif", class: "didone", weights: [400], roles: ["display"] },

  // Serif — soft (craft, warmth)
  { family: "Fraunces", class: "serif-soft", weights: [400, 500, 600, 700], roles: ["display", "heading"] },
  { family: "Bitter", class: "serif-soft", weights: [400, 600, 700], roles: ["heading", "body"] },

  // Slab (solid, robust)
  { family: "Roboto Slab", class: "slab", weights: [400, 500, 700], roles: ["display", "heading", "body"] },
  { family: "Zilla Slab", class: "slab", weights: [400, 500, 600, 700], roles: ["display", "heading", "body"] },

  // Mono (technical, precise)
  { family: "JetBrains Mono", class: "mono", weights: [400, 500, 700], roles: ["data", "body"] },
  { family: "IBM Plex Mono", class: "mono", weights: [400, 500, 600], roles: ["data", "body"] },
  { family: "Space Mono", class: "mono", weights: [400, 700], roles: ["data"] },
  { family: "Roboto Mono", class: "mono", weights: [400, 500, 700], roles: ["data"] },

  // Display (singularity, memorability)
  { family: "Bricolage Grotesque", class: "display", weights: [400, 600, 800], roles: ["display", "heading"] },
  { family: "Unbounded", class: "display", weights: [400, 600, 800], roles: ["display"] },
  { family: "Syne", class: "display", weights: [400, 600, 800], roles: ["display", "heading"] },
  { family: "Alfa Slab One", class: "display", weights: [400], roles: ["display"] },

  // Script (hand-made, vernacular)
  { family: "Caveat", class: "script", weights: [400, 600, 700], roles: ["display"] },
  { family: "Gloria Hallelujah", class: "script", weights: [400], roles: ["display"] },
];

const BY_LOWER = new Map(
  FONT_CATALOGUE.map((f) => [f.family.toLowerCase(), f]),
);

export function findFont(family: string): FontEntry | undefined {
  return BY_LOWER.get(family.trim().toLowerCase());
}

/** Every family belonging to a class, filtered to those fit for a role. */
export function fontsForClass(
  typeClass: TypeClass,
  role: "display" | "heading" | "body" | "data",
): FontEntry[] {
  return FONT_CATALOGUE.filter(
    (f) => f.class === typeClass && f.roles.includes(role),
  );
}

/**
 * Picks a family for a class and role, varying the choice by seed so two
 * brands on the same art direction do not always land on the same face.
 */
export function pickFont(
  typeClass: TypeClass,
  role: "display" | "heading" | "body" | "data",
  seed: number,
): FontEntry {
  const candidates = fontsForClass(typeClass, role);
  if (candidates.length > 0) return candidates[seed % candidates.length];

  // Class has nothing for this role — fall back to a dependable workhorse.
  const anyForRole = FONT_CATALOGUE.filter((f) => f.roles.includes(role));
  return anyForRole[seed % anyForRole.length] ?? FONT_CATALOGUE[0];
}

/** Resolves a model-supplied family, falling back within a class. */
export function resolveFont(
  family: string,
  fallbackClass: TypeClass,
  role: "display" | "heading" | "body" | "data" = "body",
  seed = 0,
): FontEntry {
  return findFont(family) ?? pickFont(fallbackClass, role, seed);
}

const FALLBACK_STACKS: Record<TypeClass, string> = {
  "grotesque-neutral": "system-ui, -apple-system, 'Segoe UI', sans-serif",
  "grotesque-contemporary": "system-ui, -apple-system, 'Segoe UI', sans-serif",
  "grotesque-condensed": "'Arial Narrow', system-ui, sans-serif",
  geometric: "system-ui, -apple-system, sans-serif",
  humanist: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  "serif-transitional": "Georgia, 'Times New Roman', serif",
  didone: "'Didot', Georgia, serif",
  "serif-soft": "Georgia, serif",
  slab: "Rockwell, Georgia, serif",
  mono: "ui-monospace, 'SF Mono', Menlo, monospace",
  display: "system-ui, -apple-system, sans-serif",
  script: "'Segoe Script', cursive",
};

export function fontStack(entry: FontEntry): string {
  return `'${entry.family}', ${FALLBACK_STACKS[entry.class]}`;
}

/** Builds a Google Fonts CSS2 href for one family with the weights we use. */
export function googleFontsHref(entry: FontEntry): string {
  const name = entry.family.replace(/ /g, "+");
  const weights = [...new Set(entry.weights)].sort((a, b) => a - b).join(";");
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${weights}&display=swap`;
}

/** One href that loads every family in a guide — used by the specimen page. */
export function combinedFontsHref(families: string[]): string {
  const parts = [...new Set(families)]
    .map((family) => findFont(family))
    .filter((f): f is FontEntry => Boolean(f))
    .map((f) => {
      const weights = [...new Set(f.weights)].sort((a, b) => a - b).join(";");
      return `family=${f.family.replace(/ /g, "+")}:wght@${weights}`;
    });

  if (parts.length === 0) return "";
  return `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap`;
}

export const FONT_FAMILY_NAMES = FONT_CATALOGUE.map((f) => f.family);
