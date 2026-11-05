import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { NewProjectButton } from "@/components/projects/NewProjectButton";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { listProjects } from "@/lib/projects";
import { FolderOpen } from "lucide-react";

export const metadata: Metadata = { title: "Projects" };

// Per-user data, and the local store is mutable — never prerender this.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await listProjects();

  const counts = {
    total: projects.length,
    complete: projects.filter((p) => p.status === "complete").length,
    drafts: projects.filter((p) => p.status === "draft").length,
  };

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Brand projects"
        description={
          projects.length > 0
            ? `${counts.total} ${counts.total === 1 ? "brand" : "brands"} · ${counts.complete} complete · ${counts.drafts} in draft`
            : "Every identity you generate lives here."
        }
        actions={<NewProjectButton />}
      />

      <div className="px-5 py-8 sm:px-8 lg:px-12">
        {projects.length === 0 ? (
          <div className="grid place-items-center rounded-[14px] border border-dashed border-line bg-white/60 px-6 py-20 text-center">
            <span className="mb-4 grid size-12 place-items-center rounded-full bg-bone-deep text-ink-muted">
              <FolderOpen size={22} />
            </span>
            <h2 className="font-display text-xl font-bold">No brands yet</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
              Start from a name and a sentence about what the brand stands for.
              A full guide takes about a minute.
            </p>
            <div className="mt-6">
              <NewProjectButton label="Create your first brand" />
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
