import { z } from "zod";
import { complete, extractJson, hasApiKey } from "./client";
import { fontStack, googleFontsHref, pickFont } from "./fonts";
import {
  ART_DIRECTIONS,
  inferPersonality,
  selectArtDirection,
  SECTOR_LABELS,
  type ArtDirection,
  type Personality,
} from "./art-direction";
import { derivePalette, seedHue, type ColorScale } from "./palette";
import type {
  BrandBrief,
  BrandStrategy,
  ColorSwatch,
  ContrastCheck,
  TypeStyle,
} from "../types";

/**
 * Step 1 of the pipeline: brand brief → art direction, palette, typography and
 * voice.
 *
 * The order matters. The art direction is chosen *first*, and everything else
 * is derived from it — harmony and saturation for colour, typographic classes
 * for type, shape language for the logo prompt. That inversion is what stops
 * the generator producing one house style with the hue swapped.
 *
 * The model contributes judgement the rules cannot: which sector this really
 * is, what the brand sounds like, and evocative names for the swatches. The
 * structure around those judgements is computed.
 */

const StrategyResponseSchema = z.object({
  sector: z.string(),
  rationale: z.string(),
  /** Optional: a hue the model believes the brand should own. */
  seedColor: z.string().optional(),
  colorNames: z
    .object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      neutral: z.string(),
    })
    .optional(),
  voice: z.object({
    personality: z.array(z.string()),
    toneDo: z.array(z.string()),
    toneDont: z.array(z.string()),
    tagline: z.string(),
    positioning: z.string(),
  }),
});

const SYSTEM = `You are a senior brand strategist. You decide what a brand *is*, not how it is laid out — the art direction system handles geometry, harmony and type pairing.

You return JSON only — no prose, no code fences.

Rules:
- Detect the sector precisely. Use one of: fintech, finance, tech, health, food, luxury, beauty, education, legal, realestate, eco, agro, sport, creative, industry, hospitality. If none fit, return the closest.
- seedColor is the single hue the brand should own, as #RRGGBB. Choose meaning over convention — avoid the sector cliché unless the brief explicitly asks for it.
- Colour names must be evocative and concrete ("Orange Four", "Brume d'Ardoise"), never "Primary Blue".
- The tagline must be a line the brand could actually print.
- toneDo and toneDont must be rules a writer can follow, not adjectives.
- Write every human-readable value (rationale, colour names, personality, toneDo, toneDont, tagline, positioning) in French, the language of the product's users. Keep the sector slug in English.`;

function buildPrompt(brief: BrandBrief, direction: ArtDirection): string {
  return `Define the strategy for this brand.

Brand name: ${brief.name}
Sector as described: ${brief.industry}
What it stands for: ${brief.keywords}
${brief.audience ? `Audience: ${brief.audience}` : ""}

The art direction has already been chosen: ${direction.name} — ${direction.description}
Its colour logic is ${direction.color.harmony} harmony, ${direction.color.saturation} saturation, ${direction.color.neutrals} neutrals.
Your seedColor must work under that logic.

Return exactly:
{
  "sector": "one slug from the allowed list",
  "rationale": "two sentences on why this direction and this colour fit the brand",
  "seedColor": "#RRGGBB",
  "colorNames": { "primary": "...", "secondary": "...", "accent": "...", "neutral": "..." },
  "voice": {
    "personality": ["3 to 5 adjectives"],
    "toneDo": ["3 concrete writing rules"],
    "toneDont": ["3 concrete things to avoid"],
    "tagline": "a short line the brand could use",
    "positioning": "one sentence positioning statement"
  }
}`;
}

/* -------------------------------------------------------------------------- */
/*  Typography                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Size steps come from the direction's modular scale rather than a fixed table,
 * so an editorial profile at 1.414 genuinely reads larger and airier than a
 * dense corporate one at 1.2.
 */
function buildTypography(
  direction: ArtDirection,
  seed: number,
): TypeStyle[] {
  const { scale } = direction.type;
  const bodySize = 17;

  const roles: Array<{
    role: TypeStyle["role"];
    size: number;
    lineHeight: number;
    tracking: number;
    usage: string;
  }> = [
    {
      role: "display",
      size: Math.round(bodySize * Math.pow(scale, 4)),
      lineHeight: 1.05,
      tracking: direction.type.tracking,
      usage: "Grandes accroches, titres de campagne, logotype.",
    },
    {
      role: "heading",
      size: Math.round(bodySize * Math.pow(scale, 2)),
      lineHeight: 1.2,
      tracking: direction.type.tracking * 0.6,
      usage: "Titres de section et de cartes, sur le web et en impression.",
    },
    {
      role: "body",
      size: bodySize,
      lineHeight: 1.6,
      tracking: 0,
      usage: "Texte courant, descriptions de produits, documents longs.",
    },
    {
      role: "data",
      size: Math.round(bodySize * 0.82),
      lineHeight: 1.45,
      tracking: 0.01,
      usage:
        "Prix, tableaux, fiches techniques, codes : tout ce qui doit s’aligner en colonnes.",
    },
  ];

  /*
   * Roles that share a class must resolve to the same *family*.
   *
   * Two different neutral grotesques side by side is the "mush" the pairing
   * rule exists to prevent — whereas one grotesque used across display and
   * body, differentiated by size and weight, is exactly what a Swiss profile
   * is asking for. Caching by class is what distinguishes the two.
   */
  const chosenByClass = new Map<string, ReturnType<typeof pickFont>>();

  return roles.map(({ role, size, lineHeight, tracking, usage }) => {
    const typeClass = direction.type[role];
    const cached = chosenByClass.get(typeClass);
    const entry = cached ?? pickFont(typeClass, role, seed + role.length);
    if (!cached) chosenByClass.set(typeClass, entry);

    return {
      role,
      family: entry.family,
      stack: fontStack(entry),
      googleFontsHref: googleFontsHref(entry),
      weights: entry.weights,
      sizePx: size,
      lineHeight,
      letterSpacingEm: Number(tracking.toFixed(3)),
      usage,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  Entry point                                                               */
/* -------------------------------------------------------------------------- */

export interface StrategyResult {
  strategy: BrandStrategy;
  palette: ColorSwatch[];
  primaryScale: ColorScale;
  contrastReport: ContrastCheck[];
  typography: TypeStyle[];
}

export interface StrategyOptions {
  /** Explicit art direction id, when the user picked one. */
  artDirectionId?: string;
  /** Explicit personality, when the wizard sliders were used. */
  personality?: Personality;
}

export async function generateStrategy(
  brief: BrandBrief,
  options: StrategyOptions = {},
): Promise<StrategyResult> {
  const provisionalSector = detectSector(`${brief.industry} ${brief.keywords}`);

  const selection = selectArtDirection({
    name: brief.name,
    sector: provisionalSector,
    keywords: brief.keywords,
    personality: options.personality ?? inferPersonality(brief.keywords),
    preferred: options.artDirectionId,
  });

  if (!hasApiKey()) {
    return assemble(brief, selection, provisionalSector, null);
  }

  try {
    const raw = await complete({
      system: SYSTEM,
      prompt: buildPrompt(brief, selection.direction),
      effort: "high",
      maxTokens: 24000,
    });
    const parsed = StrategyResponseSchema.parse(extractJson(raw));
    return assemble(brief, selection, parsed.sector || provisionalSector, parsed);
  } catch (err) {
    // A model hiccup must not lose the brand: the derived system is complete
    // on its own, and only the voice copy is poorer for it.
    console.error("Strategy generation fell back to derived defaults:", err);
    return assemble(brief, selection, provisionalSector, null);
  }
}

type ModelStrategy = z.infer<typeof StrategyResponseSchema> | null;

function assemble(
  brief: BrandBrief,
  selection: ReturnType<typeof selectArtDirection>,
  sector: string,
  model: ModelStrategy,
): StrategyResult {
  const { direction, seed } = selection;

  const palette = derivePalette({
    base: seedHue(sector, seed, model?.seedColor),
    direction,
    seed,
    names: model?.colorNames,
  });

  return {
    strategy: {
      sector,
      rationale: model?.rationale ?? derivedRationale(brief, direction, sector),
      voice: model?.voice ?? derivedVoice(brief, direction),
      artDirection: direction,
      artDirectionRationale: selection.rationale,
      seed,
    },
    palette: palette.swatches,
    primaryScale: palette.primaryScale,
    contrastReport: palette.contrastReport,
    typography: buildTypography(direction, seed),
  };
}

/* -------------------------------------------------------------------------- */
/*  Derived copy — used when no model key is configured                       */
/* -------------------------------------------------------------------------- */

function derivedRationale(
  brief: BrandBrief,
  direction: ArtDirection,
  sector: string,
): string {
  return `${brief.name} évolue dans le secteur ${SECTOR_LABELS[sector] ?? sector}. Le système suit la direction ${direction.name} : ${direction.description} Les couleurs reposent sur une harmonie ${HARMONY_LABELS[direction.color.harmony] ?? direction.color.harmony}, pour une palette qui tient aussi bien à l’écran qu’à l’impression.`;
}

function derivedVoice(brief: BrandBrief, direction: ArtDirection) {
  const traits = brief.keywords
    .split(/[,;.]/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && w.length < 22)
    .slice(0, 4);

  const loud = direction.personality.quietLoud > 0.6;
  const premium = direction.personality.massPremium > 0.7;

  return {
    personality:
      traits.length >= 3 ? traits : [...traits, "réfléchie", "directe"].slice(0, 4),
    toneDo: [
      "Commencer par le résultat, puis donner le détail.",
      loud
        ? "Des phrases courtes et affirmatives. Une idée par ligne."
        : "Laisser respirer la phrase ; expliquer avant de conclure.",
      premium
        ? "Nommer la matière, le savoir-faire ou l’artisan."
        : "Des mots concrets : nommer la chose, pas la catégorie.",
    ],
    toneDont: [
      "Pas de superlatifs impossibles à prouver.",
      "Pas de jargon du métier dans les textes destinés aux clients.",
      premium
        ? "Ne jamais parler du prix avant la valeur."
        : "Ne jamais commencer par le nom de l’entreprise.",
    ],
    tagline: `${brief.name} — ${brief.keywords.split(/[,.]/)[0]?.trim() || "fait avec soin"}.`,
    positioning: `Pour ${brief.audience || "celles et ceux qui tiennent aux détails"}, ${brief.name} est l’entreprise de ${brief.industry ? brief.industry.charAt(0).toLowerCase() + brief.industry.slice(1) : "son secteur"} qui mise sur : ${brief.keywords.split(/[,.]/)[0]?.trim() || "le travail bien fait"}.`,
  };
}

/** Libellés français des secteurs et des harmonies, pour les textes dérivés. */
const HARMONY_LABELS: Record<string, string> = {
  monochrome: "monochrome", analogous: "analogue", complementary: "complémentaire",
  "split-complementary": "complémentaire divisée", triadic: "triadique",
};

/** Kept for callers that only need the derived system. */
export function fallbackStrategy(
  brief: BrandBrief,
  options: StrategyOptions = {},
): StrategyResult {
  const sector = detectSector(`${brief.industry} ${brief.keywords}`);
  const selection = selectArtDirection({
    name: brief.name,
    sector,
    keywords: brief.keywords,
    personality: options.personality ?? inferPersonality(brief.keywords),
    preferred: options.artDirectionId,
  });
  return assemble(brief, selection, sector, null);
}

/* -------------------------------------------------------------------------- */
/*  Sector detection                                                          */
/* -------------------------------------------------------------------------- */

const SECTOR_KEYWORDS: Array<[string, string[]]> = [
  ["fintech", ["fintech", "payment", "paiement", "credit", "crédit", "lending", "wallet", "neobank"]],
  ["finance", ["bank", "banque", "insurance", "assurance", "invest", "wealth", "accounting", "comptab"]],
  ["legal", ["law", "legal", "avocat", "juridique", "notaire", "compliance", "cabinet"]],
  ["health", ["clinic", "clinique", "health", "dental", "dentaire", "medical", "médical", "santé", "pharma", "therapy"]],
  ["beauty", ["beauty", "cosmetic", "cosmétique", "skincare", "salon", "spa", "parfum"]],
  ["luxury", ["luxury", "luxe", "jewel", "bijou", "couture", "atelier", "haute", "yacht"]],
  ["food", ["café", "cafe", "coffee", "restaurant", "bakery", "boulangerie", "food", "kitchen", "brasserie", "pâtisserie", "traiteur", "roaster", "brew"]],
  ["hospitality", ["hotel", "hôtel", "resort", "lodge", "hospitality", "guesthouse"]],
  ["eco", ["eco", "sustainab", "durable", "recycl", "climate", "carbon", "green"]],
  ["agro", ["farm", "ferme", "agro", "agricultur", "harvest", "produce"]],
  ["education", ["school", "école", "education", "training", "formation", "academy", "tutor", "learning"]],
  ["realestate", ["real estate", "immobilier", "property", "construction", "btp", "architect", "builder"]],
  ["sport", ["sport", "fitness", "gym", "athletic", "running", "football", "coach"]],
  ["creative", ["studio", "design", "agency", "agence", "creative", "art", "photo", "film", "music", "musique"]],
  ["industry", ["industr", "manufact", "logistic", "factory", "usine", "supply"]],
  ["tech", ["saas", "software", "tech", "app", "ai", "data", "platform", "cloud", "dev", "api", "security", "cyber"]],
];

export function detectSector(text: string): string {
  const lower = text.toLowerCase();
  for (const [sector, words] of SECTOR_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return sector;
  }
  return "default";
}

export { ART_DIRECTIONS };
