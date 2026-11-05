import "server-only";
import { createClient, getUser } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import { migrateGuide } from "./guide-migration";
import {
  demoCreate,
  demoDelete,
  demoGet,
  demoList,
  demoUpdate,
} from "./demo-store";
import type {
  BrandGuide,
  CreationMode,
  Project,
  ProjectStatus,
} from "./types";

/**
 * Project repository.
 *
 * One interface, two backends: Supabase when credentials exist, the in-memory
 * demo store otherwise. Every page and action goes through here so the switch
 * is invisible to the rest of the app.
 */

interface ProjectRow {
  id: string;
  owner_id: string;
  name: string;
  industry: string;
  keywords: string;
  mode: CreationMode;
  status: ProjectStatus;
  guide: BrandGuide | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    industry: row.industry,
    keywords: row.keywords,
    mode: row.mode,
    status: row.status,
    // Stored guides predate later pipeline fields; bring them up to the
    // current contract on read rather than guarding every component.
    guide: row.guide ? migrateGuide(row.guide) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function withMigratedGuide(project: Project): Project {
  return project.guide
    ? { ...project, guide: migrateGuide(project.guide) }
    : project;
}

const COLUMNS =
  "id, owner_id, name, industry, keywords, mode, status, guide, created_at, updated_at";

export async function listProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) return demoList().map(withMigratedGuide);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Could not load projects: ${error.message}`);
  return (data as ProjectRow[]).map(fromRow);
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured()) {
    const project = demoGet(id);
    return project ? withMigratedGuide(project) : null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  // RLS turns "not yours" into "not found", which is the behaviour we want.
  if (error) throw new Error(`Could not load project: ${error.message}`);
  return data ? fromRow(data as ProjectRow) : null;
}

export interface CreateProjectInput {
  name: string;
  industry: string;
  keywords: string;
  audience?: string;
  mode: CreationMode;
  guide?: BrandGuide | null;
  status?: ProjectStatus;
}

export async function createProject(
  input: CreateProjectInput,
): Promise<Project> {
  if (!isSupabaseConfigured()) {
    return demoCreate({
      name: input.name,
      industry: input.industry,
      keywords: input.keywords,
      mode: input.mode,
      status: input.status ?? "draft",
      guide: input.guide ?? null,
    });
  }

  const user = await getUser();
  if (!user) throw new Error("You must be signed in to create a project.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      name: input.name,
      industry: input.industry,
      keywords: input.keywords,
      audience: input.audience ?? "",
      mode: input.mode,
      status: input.status ?? "draft",
      guide: input.guide ?? null,
    })
    .select(COLUMNS)
    .single();

  if (error) throw new Error(`Could not create project: ${error.message}`);
  return fromRow(data as ProjectRow);
}

export async function updateProject(
  id: string,
  patch: Partial<{
    name: string;
    industry: string;
    keywords: string;
    status: ProjectStatus;
    guide: BrandGuide | null;
  }>,
): Promise<Project | null> {
  if (!isSupabaseConfigured()) return demoUpdate(id, patch);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();

  if (error) throw new Error(`Could not update project: ${error.message}`);
  return data ? fromRow(data as ProjectRow) : null;
}

export async function deleteProject(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    demoDelete(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(`Could not delete project: ${error.message}`);
}
