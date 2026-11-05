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
        eyebrow="Espace de travail"
        title="Mes marques"
        description={
          projects.length > 0
            ? `${counts.total} ${counts.total === 1 ? "marque" : "marques"} · ${counts.complete} ${counts.complete === 1 ? "terminée" : "terminées"} · ${counts.drafts} en brouillon`
            : "Toutes les identités que vous créez apparaissent ici."
        }
        actions={<NewProjectButton />}
      />

      <div className="px-5 py-8 sm:px-8 lg:px-12">
        {projects.length === 0 ? (
          <div className="grid place-items-center rounded-[14px] border border-dashed border-line bg-white/60 px-6 py-20 text-center">
            <span className="mb-4 grid size-12 place-items-center rounded-full bg-bone-deep text-ink-muted">
              <FolderOpen size={22} />
            </span>
            <h2 className="font-display text-xl font-bold">Aucune marque pour l’instant</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
              Partez d’un nom et d’une phrase sur ce que défend la marque. Une charte complète prend environ une minute.
            </p>
            <div className="mt-6">
              <NewProjectButton label="Créer ma première marque" />
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
