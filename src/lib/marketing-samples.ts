import "server-only";
import { buildDemoGuide } from "./demo-store";
import type { BrandBrief, BrandGuide } from "./types";

/**
 * Sample brands rendered on the landing page.
 *
 * They run through the same deterministic pipeline the product ships, so the
 * marketing visuals are the real output rather than mocked artwork. Building
 * them once per process keeps the landing page cheap to render.
 */

const BRIEFS: BrandBrief[] = [
  {
    name: "Lumen Roasters",
    industry: "Torréfaction de café de spécialité",
    keywords:
      "origine unique, approvisionnement transparent, artisanat patient, un rituel de quartier",
    audience: "les habitués du centre-ville qui veulent savoir d’où vient leur café",
  },
  {
    name: "North Signal",
    industry: "SaaS d’analyse de données B2B",
    keywords: "clarté, l’essentiel avant le bruit, rigueur d’ingénieur, tableaux de bord sereins",
    audience: "les équipes data des PME du logiciel",
  },
  {
    name: "Verdant Clinic",
    industry: "Clinique dentaire et orthodontique",
    keywords: "calme, précision, soins sans précipitation, moderne sans être froid",
    audience: "les familles qui prennent rendez-vous elles-mêmes",
  },
  {
    name: "Atelier Frame",
    industry: "Studio de design indépendant",
    keywords: "éditorial, engagé, artisanal, identités de marque pour fondateurs",
    audience: "les fondateurs de start-up qui veulent une vraie identité",
  },
];

let cached: BrandGuide[] | null = null;

export function sampleGuides(): BrandGuide[] {
  if (!cached) cached = BRIEFS.map(buildDemoGuide);
  return cached;
}

export function heroGuide(): BrandGuide {
  return sampleGuides()[0];
}
