/**
 * Les offres BRAND GENIUS et leurs prix en FCFA.
 *
 * Ce fichier est la seule source des prix : la page Tarifs, la page de
 * paiement et l'API qui crée la session SasPay lisent toutes ces valeurs, donc
 * le montant affiché est toujours celui qui est facturé. Pour changer un prix,
 * il suffit de modifier ce tableau.
 *
 * SasPay ne propose pas de prélèvement automatique : un abonnement est donc une
 * période prépayée (30 ou 365 jours) que l'on renouvelle en payant à nouveau.
 * Un paiement fait avant la fin d'une période l'allonge au lieu de la remplacer.
 */

export type PlanId = "free" | "pro" | "studio";
export type PaidPlanId = Exclude<PlanId, "free">;
export type BillingCycle = "monthly" | "annual";

export interface Plan {
  id: PlanId;
  name: string;
  /** Prix d'un mois, en FCFA. */
  monthly: number;
  /** Prix d'une année complète, en FCFA. */
  annual: number;
  tagline: string;
  features: string[];
  cta: string;
  featured: boolean;
  /** Nombre maximum de marques ; `null` = illimité. */
  maxProjects: number | null;
  /** Les exports (PDF, kit, réseaux sociaux) portent un filigrane. */
  watermark: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratuit",
    monthly: 0,
    annual: 0,
    tagline: "Pour découvrir tout le système avant de payer.",
    features: [
      "1 marque",
      "Charte complète à l’écran",
      "Kit réseaux sociaux",
      "Exports avec filigrane",
    ],
    cta: "Commencer gratuitement",
    featured: false,
    maxProjects: 1,
    watermark: true,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 9_900,
    annual: 99_000,
    tagline: "Pour les entrepreneurs qui lancent une marque sérieusement.",
    features: [
      "Jusqu’à 10 marques",
      "Exports HD sans filigrane",
      "Charte PDF complète",
      "Kit réseaux sociaux sans filigrane",
      "Refaire n’importe quelle section",
    ],
    cta: "Choisir Pro",
    featured: true,
    maxProjects: 10,
    watermark: false,
  },
  {
    id: "studio",
    name: "Studio",
    monthly: 29_900,
    annual: 299_000,
    tagline: "Pour les agences et graphistes qui travaillent pour des clients.",
    features: [
      "Tout ce qu’il y a dans Pro",
      "Marques clients illimitées",
      "Exports sans filigrane pour vos clients",
      "Assistance prioritaire par WhatsApp",
    ],
    cta: "Choisir Studio",
    featured: false,
    maxProjects: null,
    watermark: false,
  },
];

export const CYCLE_DAYS: Record<BillingCycle, number> = {
  monthly: 30,
  annual: 365,
};

export const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "1 mois",
  annual: "1 an",
};

export function planById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function isPaidPlan(id: string): id is PaidPlanId {
  return id === "pro" || id === "studio";
}

export function isCycle(value: string): value is BillingCycle {
  return value === "monthly" || value === "annual";
}

/** Montant facturé pour une offre et une durée, en FCFA. */
export function priceFor(plan: Plan, cycle: BillingCycle): number {
  return cycle === "annual" ? plan.annual : plan.monthly;
}

/** Équivalent mensuel de l'offre annuelle, arrondi à la centaine. */
export function annualPerMonth(plan: Plan): number {
  return Math.round(plan.annual / 12 / 100) * 100;
}

/** Plus grosse économie de l'annuel par rapport au mensuel, en pourcentage. */
export const BEST_SAVING = Math.max(
  ...PLANS.filter((p) => p.monthly > 0).map((p) =>
    Math.round((1 - p.annual / (p.monthly * 12)) * 100),
  ),
);

/** « 9 900 » : séparateur de milliers français, sans décimales. */
export function formatFcfa(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
