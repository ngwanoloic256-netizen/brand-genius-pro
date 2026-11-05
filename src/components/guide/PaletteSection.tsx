"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { formatCmyk, formatRgb } from "@/lib/color";
import type { ColorRole, ColorSwatch } from "@/lib/types";

const GROUPS: Array<{ role: ColorRole; label: string; note: string }> = [
  { role: "primary", label: "Principale", note: "Porte la marque. La plus utilisée." },
  {
    role: "secondary",
    label: "Secondaire",
    note: "Profondeur et surfaces d’appui.",
  },
  { role: "accent", label: "Accent", note: "Réservée à ce qui doit se remarquer." },
  { role: "neutral", label: "Neutres", note: "Fonds, filets et textes." },
];

export function PaletteSection({
  palette,
  brandName,
}: {
  palette: ColorSwatch[];
  brandName: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied((c) => (c === value ? null : c)), 1400);
    } catch {
      // Clipboard blocked (insecure origin or permission denied) — the hex is
      // on screen and selectable, so there is nothing to recover from.
    }
  }

  const primary = palette.find((s) => s.role === "primary") ?? palette[0];
  const accent = palette.find((s) => s.role === "accent") ?? primary;
  const lightNeutral =
    palette.find((s) => s.role === "neutral") ?? palette[palette.length - 1];

  return (
    <div className="space-y-10">
      {GROUPS.map(({ role, label, note }) => {
        const swatches = palette.filter((s) => s.role === role);
        if (swatches.length === 0) return null;

        return (
          <div key={role}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.1em]">
                {label}
              </h3>
              <span className="text-[13px] text-ink-muted">{note}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {swatches.map((swatch) => (
                <button
                  key={swatch.hex + swatch.name}
                  type="button"
                  onClick={() => copy(swatch.hex)}
                  className="group overflow-hidden rounded-xl border border-line bg-white text-left transition-all hover:border-ink hover:shadow-lift"
                  title={`Copier ${swatch.hex}`}
                >
                  <div
                    className="relative flex h-24 items-end justify-between p-3"
                    style={{ background: swatch.hex, color: swatch.onColor }}
                  >
                    <span className="font-mono text-sm font-medium">
                      {swatch.hex}
                    </span>
                    <span className="opacity-0 transition-opacity group-hover:opacity-70">
                      {copied === swatch.hex ? (
                        <Check size={15} />
                      ) : (
                        <Copy size={15} />
                      )}
                    </span>
                  </div>

                  <div className="p-3.5">
                    <p className="font-semibold">{swatch.name}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                      {swatch.usage}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-1 font-mono text-[11px] text-ink-muted">
                      <div>
                        <dt className="sr-only">RGB</dt>
                        <dd>{formatRgb(swatch.rgb)}</dd>
                      </div>
                      <div>
                        <dt className="sr-only">CMYK</dt>
                        <dd>{formatCmyk(swatch.cmyk)}</dd>
                      </div>
                    </dl>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Contextual preview — the palette applied, not just listed. */}
      <div>
        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.1em]">
          En situation
        </h3>
        <div
          className="overflow-hidden rounded-xl border border-line"
          style={{ background: lightNeutral.hex }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ background: primary.hex, color: primary.onColor }}
          >
            <span className="font-display text-[15px] font-bold">
              {brandName}
            </span>
            <span className="text-[13px] opacity-75">Menu · À propos · Contact</span>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <div
              className="rounded-lg border p-4"
              style={{
                background: "#fff",
                borderColor: `${primary.hex}22`,
                color: lightNeutral.onColor,
              }}
            >
              <p className="text-[13px] font-semibold">Surface de carte</p>
              <p className="mt-1.5 text-[13px] leading-relaxed opacity-65">
                Du texte courant sur un neutre clair, comme la marque sera le plus souvent lue.
              </p>
            </div>

            <div
              className="rounded-lg p-4"
              style={{ background: primary.hex, color: primary.onColor }}
            >
              <p className="text-[13px] font-semibold">Panneau principal</p>
              <p className="mt-1.5 text-[13px] leading-relaxed opacity-80">
                La couleur de marque en pleine surface, avec un texte au contraste vérifié.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-2.5">
              <span
                className="rounded-full px-4 py-2.5 text-center text-[13px] font-semibold"
                style={{ background: accent.hex, color: accent.onColor }}
              >
                Action principale
              </span>
              <span
                className="rounded-full border px-4 py-2.5 text-center text-[13px] font-semibold"
                style={{
                  borderColor: `${primary.hex}55`,
                  color: primary.hex,
                }}
              >
                Action secondaire
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
