import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { BrandWizard } from "@/components/wizard/BrandWizard";
import type { CreationMode } from "@/lib/types";

export const metadata: Metadata = { title: "New brand" };

const MODES: CreationMode[] = ["generate_logo", "import_logo", "guide_only"];

const HEADINGS: Record<CreationMode, { title: string; description: string }> = {
  generate_logo: {
    title: "Create a brand",
    description:
      "A logo, a full guide, and contextual mockups — generated from your brief.",
  },
  import_logo: {
    title: "Import a logo",
    description:
      "Bring the logo you already use. We derive the rest of the system from it.",
  },
  guide_only: {
    title: "Brand guide from scratch",
    description:
      "Colour, type, and voice, without a logo. Add one later and the guide adapts.",
  },
};

export default async function NewProjectPage(
  props: PageProps<"/projects/new">,
) {
  const params = await props.searchParams;
  const raw = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode: CreationMode = MODES.includes(raw as CreationMode)
    ? (raw as CreationMode)
    : "generate_logo";

  const heading = HEADINGS[mode];

  return (
    <>
      <PageHeader
        eyebrow="New project"
        title={heading.title}
        description={heading.description}
      />
      <BrandWizard mode={mode} />
    </>
  );
}
