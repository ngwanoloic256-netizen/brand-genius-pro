import { Check, X } from "lucide-react";
import { SvgFrame } from "../SvgFrame";
import type { BrandGuide } from "@/lib/types";

/** Clear space, minimum sizes, and the do/don't rules. */
export function UsageSection({ guide }: { guide: BrandGuide }) {
  const { logoUsage } = guide;
  const icon = guide.logo.find((v) => v.id === "icon") ?? guide.logo[0];
  const primary = guide.logo[0];

  const dos = logoUsage.rules.filter((r) => r.kind === "do");
  const donts = logoUsage.rules.filter((r) => r.kind === "dont");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Clear space diagram */}
        <div className="rounded-xl border border-line bg-white p-6">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.1em]">
            Zone de protection
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            Laissez au moins {logoUsage.clearSpaceRatio}× la hauteur du symbole
            libre de chaque côté. Rien ne doit entrer dans la zone hachurée.
          </p>

          <div className="mt-5 grid place-items-center rounded-lg bg-bone-deep p-6">
            <div className="relative">
              <div
                className="border-2 border-dashed border-signal/45 p-10"
                aria-hidden
              >
                <SvgFrame
                  svg={icon.svg}
                  className="[&>svg]:h-20 [&>svg]:w-20"
                />
              </div>
              {/* The dashed rule is decoration and keeps the base red; these
                  are 10px words, so they take the depth that clears 4.5:1. */}
              <span className="absolute -left-1.5 top-1/2 -translate-x-full -translate-y-1/2 font-mono text-[10px] text-signal-deep">
                ½x
              </span>
              <span className="absolute left-1/2 -top-1.5 -translate-x-1/2 -translate-y-full font-mono text-[10px] text-signal-deep">
                ½x
              </span>
            </div>
          </div>
        </div>

        {/* Minimum size */}
        <div className="rounded-xl border border-line bg-white p-6">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.1em]">
            Taille minimale
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            Sous {logoUsage.minWidthPx} px à l’écran ou {logoUsage.minWidthMm} mm
            en impression, utilisez l’icône seule.
          </p>

          <div className="mt-5 flex flex-wrap items-end gap-6 rounded-lg bg-bone-deep p-6">
            <figure className="text-center">
              <SvgFrame
                svg={primary.svg}
                className="[&>svg]:h-auto [&>svg]:w-[160px]"
              />
              <figcaption className="mt-2 font-mono text-[10px] text-ink-muted">
                160 px · logo complet
              </figcaption>
            </figure>

            <figure className="text-center">
              <SvgFrame
                svg={icon.svg}
                className="[&>svg]:size-8"
              />
              <figcaption className="mt-2 font-mono text-[10px] text-ink-muted">
                32 px · icône seule
              </figcaption>
            </figure>

            <figure className="text-center">
              <SvgFrame svg={icon.svg} className="[&>svg]:size-4" />
              <figcaption className="mt-2 font-mono text-[10px] text-ink-muted">
                16px · favicon
              </figcaption>
            </figure>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RuleList
          title="À faire"
          tone="positive"
          rules={dos}
          icon={<Check size={13} strokeWidth={3} />}
        />
        <RuleList
          title="À éviter"
          tone="signal"
          rules={donts}
          icon={<X size={13} strokeWidth={3} />}
        />
      </div>
    </div>
  );
}

function RuleList({
  title,
  tone,
  rules,
  icon,
}: {
  title: string;
  tone: "positive" | "signal";
  rules: BrandGuide["logoUsage"]["rules"];
  icon: React.ReactNode;
}) {
  const badge =
    tone === "positive"
      ? "bg-positive/12 text-positive"
      : "bg-signal/12 text-signal";

  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[0.1em]">
        {title}
      </h3>
      <ul className="space-y-4">
        {rules.map((rule) => (
          <li key={rule.title} className="flex gap-3">
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${badge}`}
            >
              {icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{rule.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                {rule.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
