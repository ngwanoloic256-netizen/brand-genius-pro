import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Images, Trash2 } from "lucide-react";
import { getProject } from "@/lib/projects";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { RegenerateButton } from "@/components/guide/ExportBar";
import { updateBriefAction, deleteProjectAction } from "./actions";

export async function generateMetadata(
  props: PageProps<"/projects/[id]/settings">,
): Promise<Metadata> {
  const { id } = await props.params;
  const project = await getProject(id);
  return { title: project ? `${project.name} — Réglages` : "Réglages" };
}

const INPUT =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-ink";

export default async function BrandSettingsPage(
  props: PageProps<"/projects/[id]/settings">,
) {
  const { id } = await props.params;
  const project = await getProject(id);

  if (!project) notFound();

  return (
    <>
      <PageHeader
        eyebrow={project.name}
        title="Réglages de la marque"
        description="Modifiez le brief, refaites une section ou supprimez le projet."
        actions={
          <ButtonLink variant="ghost" size="sm" href={`/projects/${project.id}`}>
            <ArrowLeft size={15} /> Charte graphique
          </ButtonLink>
        }
      />

      <div className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8 sm:px-8">
        {/* Brief */}
        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-bold">Brief de la marque</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            Ces champs servent à chaque nouvelle création. Les modifier ne change pas la charte actuelle tant que vous ne refaites pas une section.
          </p>

          <form action={updateBriefAction} className="mt-6 grid gap-5">
            <input type="hidden" name="projectId" value={project.id} />

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">
                Nom de la marque
              </span>
              <input
                name="name"
                className={INPUT}
                defaultValue={project.name}
                maxLength={80}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">
                Secteur
              </span>
              <input
                name="industry"
                className={INPUT}
                defaultValue={project.industry}
                maxLength={120}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">
                Ce que défend la marque
              </span>
              <textarea
                name="keywords"
                className={`${INPUT} min-h-28 resize-y leading-relaxed`}
                defaultValue={project.keywords}
                maxLength={600}
              />
            </label>

            <div className="flex justify-end">
              <Button type="submit">Enregistrer le brief</Button>
            </div>
          </form>
        </section>

        {/* Regeneration */}
        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-bold">Refaire une section</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            Chaque étape est indépendante. Refaire la palette ou le logo met aussi à jour tout ce qui en dépend.
          </p>

          {project.guide ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <RegenerateButton
                projectId={project.id}
                section="palette"
                label="Palette"
              />
              <RegenerateButton
                projectId={project.id}
                section="typography"
                label="Typographie"
              />
              <RegenerateButton
                projectId={project.id}
                section="logo"
                label="Logo"
              />
              <RegenerateButton
                projectId={project.id}
                section="mockups"
                label="Mockups"
              />
            </div>
          ) : (
            <p className="mt-5 text-[13px] text-ink-muted">
              Ce projet n’a pas encore de charte.
            </p>
          )}
        </section>

        {/* Exports */}
        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-bold">Exports</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            Les logos se téléchargent en SVG et en PNG 4× sur fond transparent. La charte complète s’exporte en PDF depuis sa page.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink
              variant="secondary"
              size="sm"
              href={`/projects/${project.id}/mockups`}
            >
              <Images size={15} /> Galerie de mockups
            </ButtonLink>
            <ButtonLink
              variant="secondary"
              size="sm"
              href={`/projects/${project.id}#logo`}
            >
              Fichiers du logo
            </ButtonLink>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-xl border border-signal/25 bg-signal/[0.03] p-6">
          <h2 className="font-display text-lg font-bold text-signal-deep">
            Supprimer ce projet
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            La charte, les logos et les mockups seront supprimés définitivement. Impossible d’annuler.
          </p>

          <form action={deleteProjectAction} className="mt-5">
            <input type="hidden" name="projectId" value={project.id} />
            <Button type="submit" variant="danger" size="sm">
              <Trash2 size={15} /> Supprimer {project.name}
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
