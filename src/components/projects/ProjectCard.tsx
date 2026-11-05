import Link from "next/link";
import { SvgFrame } from "../SvgFrame";
import type { Project, ProjectStatus } from "@/lib/types";
import { primaryColor } from "@/lib/types";
import { contrastRatio } from "@/lib/color";
import { SCALE_STEPS } from "@/lib/ai/palette";

/**
 * The hex caption is set in the brand's own colour, which is the point — but
 * the brand is whatever the generator produced, so a pale yellow would render
 * the label unreadable on the white card. Walk the tonal ramp the guide already
 * carries and take the lightest step that still clears AA, so the caption stays
 * recognisably the brand's hue without ever dropping below 4.5:1.
 */
function readableBrandInk(
  hex: string,
  scale: Record<number, string> | undefined,
): string {
  if (contrastRatio(hex, "#ffffff") >= 4.5) return hex;
  if (!scale) return "var(--color-ink-muted)";

  for (const step of SCALE_STEPS) {
    const candidate = scale[step];
    if (candidate && contrastRatio(candidate, "#ffffff") >= 4.5) return candidate;
  }
  return "var(--color-ink-muted)";
}

const STATUS: Record<ProjectStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-bone-deep text-ink-muted border-line",
  },
  guide_generated: {
    label: "Guide generated",
    className: "bg-acid/12 text-acid-deep border-acid/30",
  },
  complete: {
    label: "Complete",
    className: "bg-positive/10 text-positive-deep border-positive/25",
  },
};

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "last month" : `${months} months ago`;
}

export function ProjectCard({ project }: { project: Project }) {
  const status = STATUS[project.status];
  const logo = project.guide?.logo.find((v) => v.id === "icon");
  const accent = project.guide ? primaryColor(project.guide.palette).hex : null;
  const accentInk = accent
    ? readableBrandInk(accent, project.guide?.primaryScale)
    : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col overflow-hidden rounded-[14px] border border-line bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-ink hover:shadow-lift"
    >
      {/* Logo thumbnail on a neutral ground, as the brief requires */}
      <div className="relative grid h-40 place-items-center border-b border-line bg-bone-deep grain-overlay">
        {logo ? (
          <SvgFrame
            svg={logo.svg}
            className="[&>svg]:h-16 [&>svg]:w-16 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="font-display text-3xl font-extrabold text-ink-faint">
            {project.name.slice(0, 2).toUpperCase()}
          </span>
        )}

        {project.guide && (
          <div className="absolute bottom-3 left-3 flex gap-1">
            {project.guide.palette.slice(0, 5).map((swatch) => (
              <span
                key={swatch.hex + swatch.name}
                className="size-3 rounded-full ring-1 ring-ink/10"
                style={{ background: swatch.hex }}
                title={`${swatch.name} ${swatch.hex}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[17px] font-bold leading-tight tracking-[-0.01em]">
            {project.name}
          </h3>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <p className="line-clamp-1 text-[13px] text-ink-muted">
          {project.industry || "No sector set"}
        </p>

        <p className="mt-auto pt-3 text-xs text-ink-muted">
          Updated {relativeDate(project.updatedAt)}
          {accent && (
            <span
              className="ml-2 font-mono text-[11px]"
              style={{ color: accentInk ?? undefined }}
            >
              {accent}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
