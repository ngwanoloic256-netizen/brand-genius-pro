"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteProject, getProject, updateProject } from "@/lib/projects";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Server Actions for the brand settings page.
 *
 * Both actions re-check ownership through `getProject`, which goes through RLS
 * — a Server Action is a public HTTP endpoint, so the id in the form body is
 * never trusted on its own.
 */

async function assertOwner(projectId: string) {
  if (isSupabaseConfigured()) {
    const user = await getUser();
    if (!user) throw new Error("Sign in required.");
  }
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found.");
  return project;
}

export async function updateBriefAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  await assertOwner(projectId);

  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const keywords = String(formData.get("keywords") ?? "").trim();

  if (!name || name.length > 80) throw new Error("Enter a brand name.");
  if (industry.length > 120) throw new Error("Sector is too long.");
  if (keywords.length > 600) throw new Error("Description is too long.");

  await updateProject(projectId, { name, industry, keywords });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath("/dashboard");
}

export async function deleteProjectAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  await assertOwner(projectId);

  await deleteProject(projectId);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
