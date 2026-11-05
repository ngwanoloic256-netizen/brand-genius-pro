/**
 * Libellés français des valeurs techniques de la direction artistique.
 *
 * Les valeurs restent en anglais dans le code (elles pilotent la palette et
 * les tests) ; seul l'affichage passe par ces tables.
 */
export const HARMONY_FR: Record<string, string> = {
  monochrome: "monochrome",
  analogous: "analogue",
  complementary: "complémentaire",
  "split-complementary": "complémentaire divisée",
  triadic: "triadique",
};

export const SATURATION_FR: Record<string, string> = {
  low: "faible",
  medium: "moyenne",
  high: "forte",
};

export const NEUTRALS_FR: Record<string, string> = {
  cool: "froids",
  warm: "chauds",
  true: "neutres",
};

export const CATEGORY_FR: Record<string, string> = {
  print: "Impression",
  digital: "Numérique",
  packaging: "Emballage",
  environmental: "Signalétique",
  apparel: "Textile",
};

export const ROLE_FR: Record<string, string> = {
  primary: "Principale",
  secondary: "Secondaire",
  accent: "Accent",
  neutral: "Neutres",
  display: "Affichage",
  heading: "Titres",
  body: "Texte",
  data: "Données",
};

export function fr(table: Record<string, string>, value: string): string {
  return table[value] ?? value;
}

/** Nom court du secteur, pour les étiquettes (« Santé »). */
export const SECTOR_NAME_FR: Record<string, string> = {
  fintech: "Fintech",
  finance: "Finance",
  tech: "Tech",
  health: "Santé",
  food: "Alimentation",
  luxury: "Luxe",
  beauty: "Beauté",
  education: "Éducation",
  legal: "Droit",
  realestate: "Immobilier",
  eco: "Écologie",
  agro: "Agroalimentaire",
  sport: "Sport",
  creative: "Création",
  industry: "Industrie",
  hospitality: "Hôtellerie",
  default: "Général",
};

/** Libellés des opérations limitées par heure. */
export const QUOTA_FR: Record<string, string> = {
  directions: "directions",
  guide: "charte complète",
  logo: "logo",
  palette: "palette",
  typography: "typographie",
  mockups: "mockups",
  export: "export",
};
