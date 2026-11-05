import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings2, Sparkles } from "lucide-react";
import { getProject } from "@/lib/projects";
import { combinedFontsHref } from "@/lib/ai/fonts";
import { GuideNav, GuideSection } from "@/components/guide/GuideNav";
import { LogoSection } from "@/components/guide/LogoSection";
import { PaletteSection } from "@/components/guide/PaletteSection";
import { TypographySection } from "@/components/guide/TypographySection";
import { UsageSection } from "@/components/guide/UsageSection";
import { MockupsSection } from "@/components/guide/MockupsSection";
import { VoiceSection } from "@/components/guide/VoiceSection";
import { ArtDirectionSection } from "@/components/guide/ArtDirectionSection";
import { FlyerSection } from "@/components/guide/FlyerSection";
import { SocialSection } from "@/components/guide/SocialSection";
import { currentSubscription } from "@/lib/billing/subscription";
import { ExportBar, RegenerateButton } from "@/components/guide/ExportBar";
import { ButtonLink } from "@/components/ui/Button";
import { SECTOR_NAME_FR } from "@/lib/labels-fr";

export async function generateMetadata(
  props: PageProps<"/projects/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const project = await getProject(id);
  return { title: project ? `${project.name} — Charte graphique` : "Projet" };
}

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  const project = await getProject(id);

  if (!project) notFound();

  if (!project.guide) {
    return <EmptyGuide name={project.name} id={project.id} />;
  }

  const guide = project.guide;
  const { plan } = await currentSubscription();

  // Load only the families this guide actually uses.
  const fontsHref = combinedFontsHref(guide.typography.map((t) => t.family));

  return (
    <>
      {fontsHref && <link rel="stylesheet" href={fontsHref} />}

      <header className="border-b border-line px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-eyebrow mb-2.5">
              {guide.brief.industry} · {SECTOR_NAME_FR[guide.strategy.sector] ?? guide.strategy.sector}
            </p>
            <h1 className="font-display text-[clamp(1.875rem,5vw,3rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">
              {project.name}
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
              {guide.strategy.voice.tagline}
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <ButtonLink
              variant="ghost"
              size="sm"
              href={`/projects/${project.id}/settings`}
            >
              <Settings2 size={15} /> Réglages de la marque
            </ButtonLink>
            <ExportBar guide={guide} projectId={project.id} watermark={plan.watermark} />
          </div>
        </div>
      </header>

      <div className="flex gap-10 px-5 py-10 sm:px-8 lg:px-12">
        <GuideNav />

        <div className="min-w-0 flex-1 space-y-14">
          <GuideSection
            id="direction"
            title="Direction artistique"
            description="Le profil dont découlent tous les autres choix de cette page."
          >
            <ArtDirectionSection guide={guide} />
          </GuideSection>

          <GuideSection
            id="logo"
            title="Logo et versions"
            description={guide.mark.concept}
            action={
              <RegenerateButton
                projectId={project.id}
                section="logo"
                label="Refaire"
              />
            }
          >
            <LogoSection variants={guide.logo} brandName={project.name} />
          </GuideSection>

          <GuideSection
            id="palette"
            title="Palette de couleurs"
            description="Cliquez sur une couleur pour copier son code. RVB pour l’écran, CMJN pour l’impression."
            action={
              <RegenerateButton
                projectId={project.id}
                section="palette"
                label="Refaire"
              />
            }
          >
            <PaletteSection palette={guide.palette} brandName={project.name} />
          </GuideSection>

          <GuideSection
            id="typography"
            title="Typographie"
            description="Quatre rôles, chacun sa fonction. Chaque exemple est écrit avec les mots de la marque."
            action={
              <RegenerateButton
                projectId={project.id}
                section="typography"
                label="Refaire"
              />
            }
          >
            <TypographySection guide={guide} />
          </GuideSection>

          <GuideSection
            id="usage"
            title="Utilisation du logo"
            description="Zone de protection, tailles minimales et règles pour un logo lisible partout."
          >
            <UsageSection guide={guide} />
          </GuideSection>

          <GuideSection
            id="mockups"
            title="Mockups"
            description={`${guide.mockups.length} applications across ${new Set(guide.mockups.map((m) => m.family)).size} composition families — no two consecutive scenes share an angle or a support.`}
            action={
              <RegenerateButton
                projectId={project.id}
                section="mockups"
                label="Refaire"
              />
            }
          >
            <MockupsSection mockups={guide.mockups} brandName={project.name} />
          </GuideSection>

          <GuideSection
            id="social"
            title="Kit réseaux sociaux"
            description="Photo de profil, publications, story et statut WhatsApp, couvertures Facebook, LinkedIn et YouTube, aux bonnes dimensions et avec les zones de sécurité de chaque plateforme. Modifiez le texte, tous les visuels suivent."
          >
            <SocialSection guide={guide} watermark={plan.watermark} />
          </GuideSection>

          <GuideSection
            id="flyers"
            title="Flyers"
            description="Prêts à imprimer en taille réelle, avec fond perdu et zone de sécurité. La mise en page suit la direction artistique."
          >
            <FlyerSection guide={guide} />
          </GuideSection>

          <GuideSection
            id="voice"
            title="Ton et personnalité"
            description="La façon dont la marque s’exprime à l’écrit."
          >
            <VoiceSection strategy={guide.strategy} />
          </GuideSection>
        </div>
      </div>
    </>
  );
}

function EmptyGuide({ name, id }: { name: string; id: string }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-5 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-bone-deep text-ink-muted">
          <Sparkles size={22} />
        </span>
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
          {name} n’a pas encore de charte
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
          Ce projet est un brouillon. Lancez la création pour obtenir le logo, la palette, les polices et les mockups.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <ButtonLink href="/projects/new">Créer la charte</ButtonLink>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            Retour aux projets
          </Link>
        </div>
        <p className="sr-only">Projet {id}</p>
      </div>
    </div>
  );
}
