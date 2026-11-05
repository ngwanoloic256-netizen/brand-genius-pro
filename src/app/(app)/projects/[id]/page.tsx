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
import { ExportBar, RegenerateButton } from "@/components/guide/ExportBar";
import { ButtonLink } from "@/components/ui/Button";

export async function generateMetadata(
  props: PageProps<"/projects/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const project = await getProject(id);
  return { title: project ? `${project.name} — Brand guide` : "Project" };
}

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  const project = await getProject(id);

  if (!project) notFound();

  if (!project.guide) {
    return <EmptyGuide name={project.name} id={project.id} />;
  }

  const guide = project.guide;

  // Load only the families this guide actually uses.
  const fontsHref = combinedFontsHref(guide.typography.map((t) => t.family));

  return (
    <>
      {fontsHref && <link rel="stylesheet" href={fontsHref} />}

      <header className="border-b border-line px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-eyebrow mb-2.5">
              {guide.brief.industry} · {guide.strategy.sector}
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
              <Settings2 size={15} /> Brand settings
            </ButtonLink>
            <ExportBar guide={guide} projectId={project.id} />
          </div>
        </div>
      </header>

      <div className="flex gap-10 px-5 py-10 sm:px-8 lg:px-12">
        <GuideNav />

        <div className="min-w-0 flex-1 space-y-14">
          <GuideSection
            id="direction"
            title="Art direction"
            description="The profile every other decision on this page was derived from."
          >
            <ArtDirectionSection guide={guide} />
          </GuideSection>

          <GuideSection
            id="logo"
            title="Logo & variations"
            description={guide.mark.concept}
            action={
              <RegenerateButton
                projectId={project.id}
                section="logo"
                label="Regenerate"
              />
            }
          >
            <LogoSection variants={guide.logo} brandName={project.name} />
          </GuideSection>

          <GuideSection
            id="palette"
            title="Colour palette"
            description="Click any swatch to copy its hex. RGB is for screen, CMYK for print."
            action={
              <RegenerateButton
                projectId={project.id}
                section="palette"
                label="Regenerate"
              />
            }
          >
            <PaletteSection palette={guide.palette} brandName={project.name} />
          </GuideSection>

          <GuideSection
            id="typography"
            title="Typography"
            description="Four roles, each with its own job. Every specimen is set in the brand's own words."
            action={
              <RegenerateButton
                projectId={project.id}
                section="typography"
                label="Regenerate"
              />
            }
          >
            <TypographySection guide={guide} />
          </GuideSection>

          <GuideSection
            id="usage"
            title="Logo usage"
            description="Clear space, minimum sizes, and the rules that keep the mark legible everywhere."
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
                label="Regenerate"
              />
            }
          >
            <MockupsSection mockups={guide.mockups} brandName={project.name} />
          </GuideSection>

          <GuideSection
            id="flyers"
            title="Flyers"
            description="Print-ready at true size, with bleed and a safe zone. The layout comes from the set this art direction allows."
          >
            <FlyerSection guide={guide} />
          </GuideSection>

          <GuideSection
            id="voice"
            title="Tone & personality"
            description="How the brand sounds when it writes."
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
          {name} has no guide yet
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
          This project was saved as a draft. Run the generator to produce the
          logo system, palette, typography, and mockups.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <ButtonLink href="/projects/new">Generate the guide</ButtonLink>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            Back to projects
          </Link>
        </div>
        <p className="sr-only">Project {id}</p>
      </div>
    </div>
  );
}
