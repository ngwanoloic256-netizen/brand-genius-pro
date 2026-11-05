import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { BrandWizard } from "@/components/wizard/BrandWizard";
import type { CreationMode } from "@/lib/types";

export const metadata: Metadata = { title: "New brand" };

const MODES: CreationMode[] = ["generate_logo", "import_logo", "guide_only"];

const HEADINGS: Record<CreationMode, { title: string; description: string }> = {
  generate_logo: {
    title: "Créer une marque",
    description:
      "Un logo, une charte complète et des mockups en situation, créés à partir de votre brief.",
  },
  import_logo: {
    title: "Importer un logo",
    description:
      "Apportez le logo que vous utilisez déjà. Nous en tirons le reste du système.",
  },
  guide_only: {
    title: "Charte sans logo",
    description:
      "Couleurs, polices et ton, sans logo. Ajoutez-en un plus tard, la charte s’adapte.",
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
        eyebrow="Nouveau projet"
        title={heading.title}
        description={heading.description}
      />
      <BrandWizard mode={mode} />
    </>
  );
}
