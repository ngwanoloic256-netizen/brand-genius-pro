"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { formatCmyk, formatRgb } from "@/lib/color";
import type { ColorRole, ColorSwatch } from "@/lib/types";

const GROUPS: Array<{ role: ColorRole; label: string; note: string }> = [
  { role: "primary", label: "Primary", note: "Carries the brand. Use it most." },
  {
    role: "secondary",
    label: "Secondary",
    note: "Depth and supporting surfaces.",
  },
  { role: "accent", label: "Accent", note: "Reserved for what must be noticed." },
  { role: "neutral", label: "Neutrals", note: "Backgrounds, rules, and text." },
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
                  title={`Copy ${swatch.hex}`}
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
          In context
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
            <span className="text-[13px] opacity-75">Menu · About · Contact</span>
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
              <p className="text-[13px] font-semibold">Card surface</p>
              <p className="mt-1.5 text-[13px] leading-relaxed opacity-65">
                Body copy sitting on a light neutral, the way most of the brand
                will actually be read.
              </p>
            </div>

            <div
              className="rounded-lg p-4"
              style={{ background: primary.hex, color: primary.onColor }}
            >
              <p className="text-[13px] font-semibold">Primary panel</p>
              <p className="mt-1.5 text-[13px] leading-relaxed opacity-80">
                Full-bleed brand colour with its contrast-safe foreground.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-2.5">
              <span
                className="rounded-full px-4 py-2.5 text-center text-[13px] font-semibold"
                style={{ background: accent.hex, color: accent.onColor }}
              >
                Primary action
              </span>
              <span
                className="rounded-full border px-4 py-2.5 text-center text-[13px] font-semibold"
                style={{
                  borderColor: `${primary.hex}55`,
                  color: primary.hex,
                }}
              >
                Secondary action
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
