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
    industry: "Specialty coffee roastery",
    keywords:
      "single-origin, transparent sourcing, slow craft, a neighbourhood ritual",
    audience: "City-centre regulars who care where the beans came from",
  },
  {
    name: "North Signal",
    industry: "B2B analytics SaaS",
    keywords: "clarity, signal over noise, engineering rigour, calm dashboards",
    audience: "Data teams at mid-market SaaS companies",
  },
  {
    name: "Verdant Clinic",
    industry: "Dental and orthodontic clinic",
    keywords: "calm, precise, unhurried care, modern without being clinical",
    audience: "Families booking their own appointments",
  },
  {
    name: "Atelier Frame",
    industry: "Independent design studio",
    keywords: "editorial, opinionated, craft-led, brand systems for founders",
    audience: "Seed-stage founders who need a real identity",
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
