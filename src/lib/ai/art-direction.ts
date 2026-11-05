import type { TypeClass } from "./fonts";

/**
 * Art direction profiles — the mechanism that stops every brand coming out
 * looking the same.
 *
 * Each profile is a *complete* token set: geometry, type classes, colour logic,
 * and the photographic treatment its mockups must follow. Nothing downstream
 * invents a style of its own; the palette asks the profile which harmony to
 * use, typography asks it which classes to pair, the logo prompt quotes its
 * shape language, and mockup selection is filtered by its surface rules.
 *
 * Variety between brands therefore comes from choosing a *profile*, not from
 * randomising details inside one house style.
 */

export type ColorHarmony =
  | "monochrome"
  | "analogous"
  | "complementary"
  | "split-complementary"
  | "triadic";

/** The four personality axes, each 0..1. */
export interface Personality {
  /** 0 = serious, 1 = playful */
  seriousPlayful: number;
  /** 0 = classic, 1 = modern */
  classicModern: number;
  /** 0 = mass-market, 1 = premium */
  massPremium: number;
  /** 0 = quiet, 1 = loud */
  quietLoud: number;
}

export const NEUTRAL_PERSONALITY: Personality = {
  seriousPlayful: 0.5,
  classicModern: 0.5,
  massPremium: 0.5,
  quietLoud: 0.5,
};

export interface ArtDirection {
  id: string;
  name: string;
  /** One sentence, shown to the user on the guide page. */
  description: string;

  /* Geometry */
  radius: number;
  stroke: number;
  whitespaceRatio: number;
  grid: { columns: number; gutter: number };

  /* Type */
  type: {
    display: TypeClass;
    heading: TypeClass;
    body: TypeClass;
    data: TypeClass;
    /** Modular scale ratio. */
    scale: number;
    case: "sentence" | "upper";
    /** Display tracking, in em. */
    tracking: number;
  };

  /* Colour */
  color: {
    harmony: ColorHarmony;
    saturation: "low" | "medium" | "high";
    neutrals: "cool" | "warm" | "true";
    /** Whether the brand's default surface is dark. */
    darkSurface: boolean;
  };

  /* Language, quoted into the logo prompt and shown in the guide */
  shapes: string;
  iconography: string;
  imagery: string;
  texture: string;
  shadow: string;
  layoutSignature: string;

  /* Mockup treatment — spec §7.2, driven by the profile rather than chance */
  mockup: {
    lighting: string;
    background: string;
    props: string;
    /** Backplate ids this profile leans on. */
    prefer: string[];
    /** Backplate ids that contradict it. */
    avoid: string[];
  };

  /** Sectors this profile naturally serves. */
  sectors: string[];
  /** Where the profile sits on the four axes. */
  personality: Personality;
}

/* -------------------------------------------------------------------------- */
/*  The library                                                               */
/* -------------------------------------------------------------------------- */

export const ART_DIRECTIONS: ArtDirection[] = [
  {
    id: "minimal-suisse",
    name: "Minimal suisse",
    description:
      "Alignement strict à gauche, grille visible et une seule couleur d’accent. Précis et indiscutable.",
    radius: 0,
    stroke: 1,
    whitespaceRatio: 0.45,
    grid: { columns: 12, gutter: 24 },
    type: {
      display: "grotesque-neutral",
      heading: "grotesque-neutral",
      body: "grotesque-neutral",
      data: "mono",
      scale: 1.25,
      case: "sentence",
      tracking: -0.02,
    },
    color: {
      harmony: "monochrome",
      saturation: "low",
      neutrals: "cool",
      darkSurface: false,
    },
    shapes: "orthogonales, alignement strict, asymétrie maîtrisée",
    iconography: "trait de 1,5 px, extrémités droites",
    imagery: "photo documentaire, désaturée",
    texture: "aucune",
    shadow: "aucune",
    layoutSignature: "large marge gauche, filet fin, composition en drapeau",
    mockup: {
      lighting: "soft studio",
      background: "neutral",
      props: "none",
      prefer: ["photo-stationery", "photo-business-cards", "photo-reception"],
      avoid: ["photo-tote"],
    },
    sectors: ["corporate", "architecture", "industry", "creative", "tech"],
    personality: {
      seriousPlayful: 0.15,
      classicModern: 0.8,
      massPremium: 0.65,
      quietLoud: 0.2,
    },
  },
  {
    id: "corporate-institutionnel",
    name: "Institutionnel",
    description:
      "Bandeaux pleins, symétrie et une police à empattements qui évoque la durée. Fait pour inspirer confiance.",
    radius: 3,
    stroke: 1.5,
    whitespaceRatio: 0.32,
    grid: { columns: 12, gutter: 20 },
    type: {
      display: "humanist",
      heading: "humanist",
      body: "serif-transitional",
      data: "mono",
      scale: 1.2,
      case: "sentence",
      tracking: -0.01,
    },
    color: {
      harmony: "analogous",
      saturation: "medium",
      neutrals: "cool",
      darkSurface: false,
    },
    shapes: "rectangles légèrement arrondis, masses centrées",
    iconography: "trait de 2 px, extrémités arrondies",
    imagery: "personnes au travail, lumière naturelle, cadrage sincère",
    texture: "aucune",
    shadow: "douce, légère",
    layoutSignature: "bandeau pleine largeur, blocs symétriques",
    mockup: {
      lighting: "soft studio",
      background: "neutral",
      props: "trade tools",
      prefer: ["photo-stationery", "photo-reception", "photo-business-cards"],
      avoid: ["photo-cup", "photo-pouch"],
    },
    sectors: ["legal", "finance", "fintech", "education", "health", "public"],
    personality: {
      seriousPlayful: 0.2,
      classicModern: 0.45,
      massPremium: 0.5,
      quietLoud: 0.35,
    },
  },
  {
    id: "luxe-editorial",
    name: "Luxe éditorial",
    description:
      "Grandes marges, capitales espacées et police à fort contraste. L’assurance par la retenue.",
    radius: 0,
    stroke: 1,
    whitespaceRatio: 0.55,
    grid: { columns: 12, gutter: 32 },
    type: {
      display: "didone",
      heading: "didone",
      body: "humanist",
      data: "mono",
      scale: 1.414,
      case: "upper",
      tracking: 0.04,
    },
    color: {
      harmony: "monochrome",
      saturation: "low",
      neutrals: "warm",
      darkSurface: false,
    },
    shapes: "filets fins, grands vides, rien de décoratif",
    iconography: "trait de 1 px, allongé",
    imagery: "nature morte en clair-obscur, peu d’objets",
    texture: "aucune",
    shadow: "profonde et douce",
    layoutSignature: "très grandes marges, capitales espacées, titre centré",
    mockup: {
      lighting: "chiaroscuro",
      background: "deep neutral",
      props: "minimal",
      prefer: ["photo-box", "photo-bottle", "photo-business-cards"],
      avoid: ["photo-tote", "photo-cup"],
    },
    sectors: ["luxury", "beauty", "fashion", "hospitality", "jewellery"],
    personality: {
      seriousPlayful: 0.2,
      classicModern: 0.4,
      massPremium: 0.95,
      quietLoud: 0.25,
    },
  },
  {
    id: "tech-futuriste",
    name: "Technique",
    description:
      "Fonds sombres, police à chasse fixe pour les données et un accent lumineux. Conçu comme un outil d’ingénieur.",
    radius: 6,
    stroke: 1.5,
    whitespaceRatio: 0.38,
    grid: { columns: 12, gutter: 24 },
    type: {
      display: "geometric",
      heading: "geometric",
      body: "grotesque-contemporary",
      data: "mono",
      scale: 1.25,
      case: "sentence",
      tracking: -0.025,
    },
    color: {
      harmony: "split-complementary",
      saturation: "high",
      neutrals: "cool",
      darkSurface: true,
    },
    shapes: "rectangles arrondis, grille de points, angles précis",
    iconography: "trait de 1,5 px, construction géométrique",
    imagery: "rendus abstraits, pose longue, écrans",
    texture: "fine grille de points",
    shadow: "halo lumineux plutôt qu’ombre portée",
    layoutSignature: "panneau sombre, libellés à chasse fixe, blocs de données denses",
    mockup: {
      lighting: "backlit",
      background: "dark",
      props: "none",
      prefer: ["photo-reception", "photo-business-cards", "photo-box"],
      avoid: ["photo-pouch", "photo-bottle", "photo-cup"],
    },
    sectors: ["tech", "saas", "data", "security", "fintech"],
    personality: {
      seriousPlayful: 0.3,
      classicModern: 0.95,
      massPremium: 0.6,
      quietLoud: 0.55,
    },
  },
  {
    id: "organique-artisanal",
    name: "Artisanal",
    description:
      "Empattements doux, pigments terreux et matière visible. Fait main, et fier de l’être.",
    radius: 18,
    stroke: 2,
    whitespaceRatio: 0.35,
    grid: { columns: 12, gutter: 20 },
    type: {
      display: "serif-soft",
      heading: "serif-soft",
      body: "humanist",
      data: "mono",
      scale: 1.333,
      case: "sentence",
      tracking: -0.015,
    },
    color: {
      harmony: "analogous",
      saturation: "medium",
      neutrals: "warm",
      darkSurface: false,
    },
    shapes: "courbes libres, traits dessinés à la main, tampons",
    iconography: "trait de 2 px, extrémités irrégulières",
    imagery: "matières brutes, mains au travail, lumière rasante",
    texture: "papier et kraft",
    shadow: "naturelle, directionnelle",
    layoutSignature: "badge tampon, étiquette composée à la main, bord déchiré",
    mockup: {
      lighting: "natural side light",
      background: "material surface",
      props: "botanical, raw materials",
      prefer: ["photo-pouch", "photo-tote", "photo-bottle", "photo-cup"],
      avoid: ["photo-reception"],
    },
    sectors: ["food", "agro", "craft", "eco", "hospitality"],
    personality: {
      seriousPlayful: 0.55,
      classicModern: 0.3,
      massPremium: 0.55,
      quietLoud: 0.4,
    },
  },
  {
    id: "pop-ludique",
    name: "Pop ludique",
    description:
      "Formes arrondies, couleurs vives et typographie qui claque. Fait pour se voir de loin.",
    radius: 999,
    stroke: 3,
    whitespaceRatio: 0.25,
    grid: { columns: 12, gutter: 16 },
    type: {
      display: "display",
      // Heading shares the body's class so the system stays within the
      // three-family ceiling: one display face carries the personality, one
      // geometric does the work, one mono handles data.
      heading: "geometric",
      body: "geometric",
      data: "mono",
      scale: 1.333,
      case: "sentence",
      tracking: -0.03,
    },
    color: {
      harmony: "triadic",
      saturation: "high",
      neutrals: "warm",
      darkSurface: false,
    },
    shapes: "formes empilées, rotations, grands aplats",
    iconography: "trait de 3 px, extrémités arrondies, formes pleines",
    imagery: "photos produit lumineuses, ombres dures",
    texture: "aucune",
    shadow: "décalée et dure",
    layoutSignature: "blocs de couleur empilés, badge incliné, texte géant",
    mockup: {
      lighting: "hard sunlit shadows",
      background: "primary colour",
      props: "colourful everyday objects",
      prefer: ["photo-cup", "photo-tote", "photo-pouch"],
      avoid: ["photo-stationery", "photo-reception"],
    },
    sectors: ["food", "retail", "childhood", "sport", "entertainment"],
    personality: {
      seriousPlayful: 0.9,
      classicModern: 0.75,
      massPremium: 0.25,
      quietLoud: 0.9,
    },
  },
  {
    id: "brutaliste",
    name: "Brutaliste",
    description:
      "Bordures épaisses, police condensée et couleurs brutes. Volontairement brut, impossible à ignorer.",
    radius: 0,
    stroke: 3,
    whitespaceRatio: 0.28,
    grid: { columns: 12, gutter: 16 },
    type: {
      display: "grotesque-condensed",
      heading: "grotesque-condensed",
      body: "grotesque-neutral",
      data: "mono",
      scale: 1.5,
      case: "upper",
      tracking: -0.02,
    },
    color: {
      harmony: "complementary",
      saturation: "high",
      neutrals: "true",
      darkSurface: false,
    },
    shapes: "rectangles durs, bordures de 3 px, décalages volontaires",
    iconography: "trait de 3 px, extrémités franches",
    imagery: "photocopie très contrastée, grain",
    texture: "grain visible",
    shadow: "aucune",
    layoutSignature: "cadre épais, blocs désalignés, contraste violent",
    mockup: {
      lighting: "hard sunlit shadows",
      background: "primary colour",
      props: "none",
      prefer: ["photo-billboard", "photo-business-cards", "photo-tote"],
      avoid: ["photo-bottle", "photo-reception"],
    },
    sectors: ["creative", "music", "culture", "fashion", "events"],
    personality: {
      seriousPlayful: 0.6,
      classicModern: 0.85,
      massPremium: 0.35,
      quietLoud: 0.95,
    },
  },
  {
    id: "retro-vintage",
    name: "Rétro",
    description:
      "Police à empattements carrés, badges et chaleur orange brûlé. La crédibilité d’un siècle d’enseignes peintes.",
    radius: 4,
    stroke: 2.5,
    whitespaceRatio: 0.3,
    grid: { columns: 12, gutter: 20 },
    type: {
      display: "slab",
      heading: "slab",
      body: "humanist",
      data: "mono",
      scale: 1.333,
      case: "upper",
      tracking: 0.02,
    },
    color: {
      harmony: "analogous",
      saturation: "medium",
      neutrals: "warm",
      darkSurface: false,
    },
    shapes: "arcs, banderoles, badges, filets concentriques",
    iconography: "trait de 2,5 px, formes pleines",
    imagery: "pellicule chaude, hautes lumières passées",
    texture: "trame de demi-teinte",
    shadow: "décalée et plate",
    layoutSignature: "badge circulaire, banderole, nom en arc",
    mockup: {
      lighting: "natural side light",
      background: "material surface",
      props: "trade tools",
      prefer: ["photo-cup", "photo-pouch", "photo-storefront", "photo-tote"],
      avoid: ["photo-reception"],
    },
    sectors: ["food", "hospitality", "craft", "barber", "brewery"],
    personality: {
      seriousPlayful: 0.65,
      classicModern: 0.2,
      massPremium: 0.4,
      quietLoud: 0.6,
    },
  },
  {
    id: "eco-naturel",
    name: "Naturel",
    description:
      "Sauge, argile et crème avec une typographie humaniste. Calme sans être fade.",
    radius: 12,
    stroke: 1.5,
    whitespaceRatio: 0.42,
    grid: { columns: 12, gutter: 24 },
    type: {
      display: "humanist",
      heading: "humanist",
      body: "humanist",
      data: "mono",
      scale: 1.25,
      case: "sentence",
      tracking: -0.01,
    },
    color: {
      harmony: "analogous",
      saturation: "low",
      neutrals: "warm",
      darkSurface: false,
    },
    shapes: "rectangles doux et arrondis, courbes organiques",
    iconography: "trait de 1,5 px, extrémités arrondies",
    imagery: "végétal, lumière du jour, sans mise en scène",
    texture: "papier kraft",
    shadow: "douce, naturelle",
    layoutSignature: "interligne généreux, filet végétal, panneau doux",
    mockup: {
      lighting: "natural side light",
      background: "material surface",
      props: "botanical",
      prefer: ["photo-tote", "photo-pouch", "photo-bottle", "photo-stationery"],
      avoid: ["photo-billboard"],
    },
    sectors: ["eco", "health", "wellness", "agro", "beauty"],
    personality: {
      seriousPlayful: 0.45,
      classicModern: 0.55,
      massPremium: 0.5,
      quietLoud: 0.2,
    },
  },
  {
    id: "premium-sombre",
    name: "Premium sombre",
    description:
      "Anthracite et laiton, dégradés légers, ombres profondes. Haut de gamme sans le dire.",
    radius: 6,
    stroke: 1,
    whitespaceRatio: 0.48,
    grid: { columns: 12, gutter: 28 },
    type: {
      display: "grotesque-contemporary",
      heading: "grotesque-contemporary",
      body: "serif-transitional",
      data: "mono",
      scale: 1.333,
      case: "sentence",
      tracking: -0.02,
    },
    color: {
      harmony: "monochrome",
      saturation: "low",
      neutrals: "warm",
      darkSurface: true,
    },
    shapes: "rectangles sobrement arrondis, fins filets métalliques",
    iconography: "trait de 1 px, détails fins",
    imagery: "photo produit en clé basse, une seule source",
    texture: "dégradé très subtil",
    shadow: "profonde et diffuse",
    layoutSignature: "fond sombre, filet fin, libellé en petites capitales",
    mockup: {
      lighting: "chiaroscuro",
      background: "dark",
      props: "minimal",
      prefer: ["photo-box", "photo-bottle", "photo-desk", "photo-business-cards"],
      avoid: ["photo-tote", "photo-cup"],
    },
    sectors: ["luxury", "finance", "automotive", "hospitality", "tech"],
    personality: {
      seriousPlayful: 0.15,
      classicModern: 0.7,
      massPremium: 0.9,
      quietLoud: 0.3,
    },
  },
];

const BY_ID = new Map(ART_DIRECTIONS.map((ad) => [ad.id, ad]));

export function artDirectionById(id: string): ArtDirection | undefined {
  return BY_ID.get(id);
}

/* -------------------------------------------------------------------------- */
/*  Deterministic seed                                                        */
/* -------------------------------------------------------------------------- */

/** FNV-1a. Stable across runs and platforms, which is the whole point. */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * The seed the whole system derives from.
 *
 * Note the two stages. The art direction is chosen from a seed built out of the
 * name and sector alone, because the spec's `hash(name + sector + direction)`
 * would otherwise need the direction before it could pick one. Once chosen, the
 * direction folds back in, so everything downstream varies with it — and a
 * brand that keeps its name, sector and direction always regenerates
 * identically.
 */
export function baseSeed(name: string, sector: string): number {
  return hashString(`${name.trim().toLowerCase()}|${sector}`);
}

export function brandSeed(
  name: string,
  sector: string,
  artDirectionId: string,
): number {
  return hashString(
    `${name.trim().toLowerCase()}|${sector}|${artDirectionId}`,
  );
}

/* -------------------------------------------------------------------------- */
/*  Selection                                                                 */
/* -------------------------------------------------------------------------- */

function personalityDistance(a: Personality, b: Personality): number {
  return (
    Math.abs(a.seriousPlayful - b.seriousPlayful) +
    Math.abs(a.classicModern - b.classicModern) +
    Math.abs(a.massPremium - b.massPremium) +
    Math.abs(a.quietLoud - b.quietLoud)
  ) / 4;
}

/** How far a profile sits from the bland centre. */
function extremity(p: Personality): number {
  return personalityDistance(p, NEUTRAL_PERSONALITY);
}

function isNeutral(p: Personality | undefined): boolean {
  return !p || extremity(p) < 0.12;
}

/** Keyword hooks that let the brief's own words pull toward a profile. */
const VALUE_HOOKS: Record<string, string[]> = {
  "minimal-suisse": ["minimal", "precise", "precision", "rigour", "rigor", "clarity", "systematic", "swiss", "clean"],
  "corporate-institutionnel": ["trust", "trusted", "reliable", "established", "institutional", "compliance", "secure", "serious"],
  "luxe-editorial": ["luxury", "premium", "refined", "elegant", "couture", "exclusive", "bespoke", "haute"],
  "tech-futuriste": ["technical", "engineering", "data", "platform", "infrastructure", "developer", "api", "futuristic"],
  "organique-artisanal": ["craft", "handmade", "artisan", "slow", "small-batch", "traditional", "sourcing", "roast"],
  "pop-ludique": ["fun", "playful", "bold", "energetic", "young", "vibrant", "joyful", "loud"],
  "brutaliste": ["raw", "unfiltered", "radical", "provocative", "opinionated", "counter", "underground"],
  "retro-vintage": ["heritage", "vintage", "retro", "classic", "since", "old-school", "nostalgic"],
  "eco-naturel": ["natural", "eco", "sustainable", "organic", "calm", "gentle", "wellbeing", "wellness", "green"],
  "premium-sombre": ["premium", "discreet", "understated", "sophisticated", "exclusive", "high-end", "quiet luxury"],
};

export interface SelectionInput {
  name: string;
  sector: string;
  keywords: string;
  personality?: Personality;
  /** Explicit override — the user picked a direction themselves. */
  preferred?: string;
}

export interface SelectionResult {
  direction: ArtDirection;
  seed: number;
  /** Why this profile, in one sentence, for the guide. */
  rationale: string;
  /** Ranked runners-up, offered in the wizard. */
  alternatives: ArtDirection[];
}

/**
 * Chooses the art direction.
 *
 * Scoring is sector first, then the brief's own vocabulary. Personality only
 * participates when the user actually expressed one — the spec is explicit that
 * a brief sitting at the middle of all four axes must *not* collapse onto a
 * safe house style, so in that case the score rewards profiles that are far
 * from neutral instead. A bland brief gets an opinionated direction, which is
 * the opposite of what averaging would produce.
 */
export function selectArtDirection(input: SelectionInput): SelectionResult {
  const seed = baseSeed(input.name, input.sector);

  if (input.preferred) {
    const forced = artDirectionById(input.preferred);
    if (forced) {
      return {
        direction: forced,
        seed: brandSeed(input.name, input.sector, forced.id),
        rationale: `${forced.name} a été choisie par vous.`,
        alternatives: ART_DIRECTIONS.filter((ad) => ad.id !== forced.id).slice(0, 3),
      };
    }
  }

  const words = `${input.keywords} ${input.sector}`.toLowerCase();
  const neutral = isNeutral(input.personality);

  const scored = ART_DIRECTIONS.map((direction) => {
    const sectorHit = direction.sectors.includes(input.sector) ? 3 : 0;

    const hooks = VALUE_HOOKS[direction.id] ?? [];
    const valueHits = hooks.filter((hook) => words.includes(hook)).length;

    const personalityTerm = neutral
      ? // No stated personality: reward conviction rather than safety.
        extremity(direction.personality) * 2
      : -personalityDistance(direction.personality, input.personality!) * 4;

    return {
      direction,
      score: sectorHit + valueHits * 1.5 + personalityTerm,
    };
  }).sort((a, b) => b.score - a.score);

  // Rotate within the leading band so two brands in one sector still diverge,
  // while never dropping to a profile the sector contradicts.
  const top = scored.filter((s) => s.score >= scored[0].score - 1.0);
  const chosen = top[seed % top.length].direction;

  return {
    direction: chosen,
    seed: brandSeed(input.name, input.sector, chosen.id),
    rationale: buildRationale(chosen, input, neutral),
    alternatives: scored
      .map((s) => s.direction)
      .filter((d) => d.id !== chosen.id)
      .slice(0, 3),
  };
}

/** Libellés français des secteurs (« le secteur de la santé »). */
export const SECTOR_LABELS: Record<string, string> = {
  fintech: "de la fintech", finance: "de la finance", tech: "de la tech", health: "de la santé",
  food: "de l’alimentation", luxury: "du luxe", beauty: "de la beauté", education: "de l’éducation",
  legal: "du droit", realestate: "de l’immobilier", eco: "de l’écologie", agro: "de l’agroalimentaire",
  sport: "du sport", creative: "de la création", industry: "de l’industrie", hospitality: "de l’hôtellerie",
  default: "de son marché",
};

function buildRationale(
  direction: ArtDirection,
  input: SelectionInput,
  neutral: boolean,
): string {
  const sectorFit = direction.sectors.includes(input.sector)
    ? `Elle convient naturellement au secteur ${SECTOR_LABELS[input.sector] ?? input.sector}`
    : `Elle prend le contre-pied du style habituel du secteur ${SECTOR_LABELS[input.sector] ?? input.sector}`;

  return neutral
    ? `${sectorFit}, et le brief laissait la personnalité ouverte : le système a donc pris une position claire plutôt qu’un juste milieu sans saveur. ${direction.description}`
    : `${sectorFit}, et elle correspond à la personnalité choisie. ${direction.description}`;
}

/** Reads personality out of free-text keywords when no sliders were set. */
export function inferPersonality(keywords: string): Personality | undefined {
  const words = keywords.toLowerCase();
  const axes = { ...NEUTRAL_PERSONALITY };
  let moved = false;

  const nudge = (
    axis: keyof Personality,
    hooks: string[],
    value: number,
  ) => {
    if (hooks.some((hook) => words.includes(hook))) {
      axes[axis] = value;
      moved = true;
    }
  };

  nudge("seriousPlayful", ["playful", "fun", "joyful", "cheeky", "vibrant"], 0.85);
  nudge("seriousPlayful", ["serious", "rigorous", "clinical", "precise", "formal"], 0.15);
  nudge("classicModern", ["modern", "contemporary", "futuristic", "tech"], 0.85);
  nudge("classicModern", ["heritage", "traditional", "classic", "timeless"], 0.2);
  nudge("massPremium", ["premium", "luxury", "bespoke", "high-end", "exclusive"], 0.9);
  nudge("massPremium", ["affordable", "accessible", "everyday", "mass"], 0.2);
  nudge("quietLoud", ["bold", "loud", "energetic", "striking"], 0.85);
  nudge("quietLoud", ["quiet", "calm", "understated", "discreet", "subtle"], 0.15);

  return moved ? axes : undefined;
}
