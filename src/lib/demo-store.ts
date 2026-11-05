import { fallbackStrategy } from "./ai/strategy";
import { fallbackMark, buildLogoUsage, buildLogoVariants } from "./ai/logo";
import { buildSceneContext, generateMockups } from "./ai/mockups";
import { enforceQuality } from "./ai/quality";
import type { BrandBrief, BrandGuide, Project, ProjectStatus } from "./types";

/**
 * In-memory project store used when Supabase credentials are absent.
 *
 * It exists so the product is fully explorable — dashboard, wizard, charte,
 * mockups, export — before any infrastructure is provisioned. It is process
 * local and deliberately not durable; configuring Supabase switches the
 * repository over transparently.
 */

const DEMO_USER = "demo-user";

interface SeedSpec {
  id: string;
  name: string;
  industry: string;
  keywords: string;
  audience: string;
  status: ProjectStatus;
  daysAgo: number;
}

const SEEDS: SeedSpec[] = [
  {
    id: "demo-lumen",
    name: "Lumen Roasters",
    industry: "Specialty coffee roastery",
    keywords:
      "single-origin, transparent sourcing, slow craft, neighbourhood ritual",
    audience: "City-centre regulars who care where the beans came from",
    status: "complete",
    daysAgo: 1,
  },
  {
    id: "demo-northsignal",
    name: "North Signal",
    industry: "B2B analytics SaaS",
    keywords: "clarity, signal over noise, engineering rigour, calm dashboards",
    audience: "Data teams at mid-market SaaS companies",
    status: "guide_generated",
    daysAgo: 4,
  },
  {
    id: "demo-verdant",
    name: "Verdant Clinic",
    industry: "Dental and orthodontic clinic",
    keywords: "calm, precise, unhurried care, modern without being clinical",
    audience: "Families and professionals booking their own appointments",
    status: "complete",
    daysAgo: 9,
  },
  {
    id: "demo-atelier",
    name: "Atelier Frame",
    industry: "Independent design studio",
    keywords: "editorial, opinionated, craft-led, brand systems for founders",
    audience: "Seed-stage founders who need a real identity, not a template",
    status: "draft",
    daysAgo: 14,
  },
];

/** Builds a full guide with the deterministic (no-API-key) pipeline. */
export function buildDemoGuide(brief: BrandBrief): BrandGuide {
  const { strategy, palette, primaryScale, contrastReport, typography } =
    fallbackStrategy(brief);
  const mark = fallbackMark(brief);
  const logo = buildLogoVariants(brief, mark, palette, typography);
  const ctx = buildSceneContext(
    brief.name,
    strategy.voice.tagline,
    mark.markup,
    palette,
    typography,
  );

  const { guide, report } = enforceQuality({
    brief,
    strategy,
    palette,
    primaryScale,
    contrastReport,
    typography,
    mark,
    logo,
    logoUsage: buildLogoUsage(brief),
    mockups: generateMockups(ctx, strategy.sector, 8, strategy.artDirection),
    quality: { passed: true, issues: [] },
    generatedAt: new Date().toISOString(),
  });

  return { ...guide, quality: report };
}

/**
 * The store hangs off `globalThis` rather than a module-level binding.
 *
 * Route handlers, Server Components, and Server Actions can each be evaluated
 * in a separate module instance — in dev with Turbopack they routinely are —
 * so a plain module variable gives every caller its own empty Map. That looked
 * exactly like a broken database: a project created through `/api/generate`
 * would 404 on the page that redirected to it.
 */
const STORE_KEY = Symbol.for("brand-genius.demo-store");

type GlobalWithStore = typeof globalThis & {
  [STORE_KEY]?: Map<string, Project>;
};

function seed(): Map<string, Project> {
  const map = new Map<string, Project>();
  const now = Date.now();

  for (const spec of SEEDS) {
    const brief: BrandBrief = {
      name: spec.name,
      industry: spec.industry,
      keywords: spec.keywords,
      audience: spec.audience,
    };
    const timestamp = new Date(now - spec.daysAgo * 86_400_000).toISOString();

    map.set(spec.id, {
      id: spec.id,
      ownerId: DEMO_USER,
      name: spec.name,
      industry: spec.industry,
      keywords: spec.keywords,
      status: spec.status,
      mode: "generate_logo",
      guide: spec.status === "draft" ? null : buildDemoGuide(brief),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return map;
}

function getStore(): Map<string, Project> {
  const globalStore = globalThis as GlobalWithStore;
  if (!globalStore[STORE_KEY]) globalStore[STORE_KEY] = seed();
  return globalStore[STORE_KEY];
}

export function demoList(): Project[] {
  return [...getStore().values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function demoGet(id: string): Project | null {
  return getStore().get(id) ?? null;
}

export function demoCreate(
  input: Omit<Project, "id" | "ownerId" | "createdAt" | "updatedAt">,
): Project {
  const now = new Date().toISOString();
  const project: Project = {
    ...input,
    id: `local-${Math.random().toString(36).slice(2, 10)}`,
    ownerId: DEMO_USER,
    createdAt: now,
    updatedAt: now,
  };
  getStore().set(project.id, project);
  return project;
}

export function demoUpdate(
  id: string,
  patch: Partial<Project>,
): Project | null {
  const current = getStore().get(id);
  if (!current) return null;
  const next: Project = {
    ...current,
    ...patch,
    id: current.id,
    updatedAt: new Date().toISOString(),
  };
  getStore().set(id, next);
  return next;
}

export function demoDelete(id: string): boolean {
  return getStore().delete(id);
}
