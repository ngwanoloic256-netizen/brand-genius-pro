import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProject } from "@/lib/projects";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { MockupsSection } from "@/components/guide/MockupsSection";
import { RegenerateButton } from "@/components/guide/ExportBar";
import { ButtonLink } from "@/components/ui/Button";

export async function generateMetadata(
  props: PageProps<"/projects/[id]/mockups">,
): Promise<Metadata> {
  const { id } = await props.params;
  const project = await getProject(id);
  return { title: project ? `${project.name} — Mockups` : "Mockups" };
}

export default async function MockupsPage(
  props: PageProps<"/projects/[id]/mockups">,
) {
  const { id } = await props.params;
  const project = await getProject(id);

  if (!project?.guide) notFound();

  const { mockups } = project.guide;
  const families = new Set(mockups.map((m) => m.family));

  return (
    <>
      <PageHeader
        eyebrow={project.name}
        title="Mockup gallery"
        description={`${mockups.length} applications drawn from ${families.size} composition families. Click any mockup for the full-screen view and an HD download.`}
        actions={
          <>
            <ButtonLink
              variant="ghost"
              size="sm"
              href={`/projects/${project.id}`}
            >
              <ArrowLeft size={15} /> Brand guide
            </ButtonLink>
            <RegenerateButton
              projectId={project.id}
              section="mockups"
              label="Regenerate all"
            />
          </>
        }
      />

      <div className="px-5 py-8 sm:px-8 lg:px-12">
        <MockupsSection mockups={mockups} brandName={project.name} />
      </div>
    </>
  );
}
