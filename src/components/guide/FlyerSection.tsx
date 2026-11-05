"use client";

import { useMemo, useState } from "react";
import { Check, Download, X } from "lucide-react";
import { SvgFrame } from "../SvgFrame";
import { downloadSvg, downloadPng } from "@/lib/export/assets";
import { checkFlyer, generateFlyers } from "@/lib/ai/flyer";
import type { BrandGuide } from "@/lib/types";

/**
 * Print-ready flyers.
 *
 * The layout is chosen by the brand's seed from the set its art direction
 * permits, so a flyer cannot contradict the identity it is advertising. The
 * checklist beside each one is the spec's output gate, shown rather than
 * hidden: a customer sending this to a printer deserves to see that bleed,
 * hierarchy and contrast were actually verified.
 */
export function FlyerSection({ guide }: { guide: BrandGuide }) {
  const [formatId, setFormatId] = useState<string>("a5");

  const flyers = useMemo(
    () => generateFlyers(guide, { formats: ["a5", "a6", "dl", "a4"] }),
    [guide],
  );

  const active = flyers.find((f) => f.format.id === formatId) ?? flyers[0];
  const checks = useMemo(
    () => (active ? checkFlyer(active, guide) : []),
    [active, guide],
  );

  if (!active) return null;

  const slug =
    guide.brief.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "brand";

  return (
    <div className="space-y-5">
      <div className="scroll-x flex gap-2 pb-1">
        {flyers.map((flyer) => (
          <button
            key={flyer.format.id}
            onClick={() => setFormatId(flyer.format.id)}
            aria-pressed={flyer.format.id === active.format.id}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              flyer.format.id === active.format.id
                ? "border-ink bg-ink text-bone"
                : "border-line bg-white text-ink-muted hover:border-ink hover:text-ink"
            }`}
          >
            {flyer.format.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <figure className="overflow-hidden rounded-xl border border-line bg-bone-deep p-6">
          <SvgFrame
            svg={active.svg}
            className="mx-auto [&>svg]:h-auto [&>svg]:max-h-[70vh] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:shadow-lift"
          />
          <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <span className="text-ink-muted">
              {active.label} · {active.format.width}×{active.format.height} mm
              {" + 3 mm de fond perdu"}
            </span>
            <span className="flex gap-2">
              <button
                onClick={() => downloadSvg(active.svg, `${slug}-flyer-${active.format.id}`)}
                className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted transition-colors hover:border-ink hover:text-ink"
              >
                SVG
              </button>
              <button
                onClick={() => downloadPng(active.svg, `${slug}-flyer-${active.format.id}`, 4)}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted transition-colors hover:border-ink hover:text-ink"
              >
                <Download size={11} /> PNG
              </button>
            </span>
          </figcaption>
        </figure>

        <div className="rounded-xl border border-line bg-white p-5">
          <h3 className="mb-1 text-[13px] font-bold uppercase tracking-[0.1em]">
            Contrôle avant impression
          </h3>
          <p className="mb-4 text-[13px] leading-relaxed text-ink-muted">
            Vérifié sur ce visuel précis, pas sur un modèle.
          </p>

          <ul className="space-y-3">
            {checks.map((check) => (
              <li key={check.label} className="flex gap-2.5">
                <span
                  className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${
                    check.passes
                      ? "bg-positive/12 text-positive"
                      : "bg-signal/12 text-signal"
                  }`}
                >
                  {check.passes ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <X size={12} strokeWidth={3} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">
                    {check.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-muted">
                    {check.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-5 border-t border-line-soft pt-4 text-[12px] leading-relaxed text-ink-muted">
            Exportez en SVG pour l’imprimeur : vectoriel, fond perdu déjà inclus. Convertissez en CMJN et PDF/X-4 lors de la préparation à l’impression.
          </p>
        </div>
      </div>
    </div>
  );
}
