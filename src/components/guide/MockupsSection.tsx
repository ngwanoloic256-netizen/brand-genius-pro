"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, X, Maximize2 } from "lucide-react";
import { SvgFrame } from "../SvgFrame";
import { downloadPng, downloadSvg } from "@/lib/export/assets";
import { CATEGORY_LABELS } from "@/lib/ai/mockups";

const FAMILY_FR: Record<string, string> = {
  "flat-lay": "vue du dessus",
  lifestyle: "en situation",
  "product-closeup": "gros plan produit",
  "digital-screen": "écran",
  signage: "signalétique",
};
import type { Mockup, MockupCategory } from "@/lib/types";

/**
 * Masonry gallery. The uneven column flow is deliberate: a uniform grid makes
 * even genuinely different scenes read as repetitive.
 */
export function MockupsSection({
  mockups,
  brandName,
}: {
  mockups: Mockup[];
  brandName: string;
}) {
  const [filter, setFilter] = useState<MockupCategory | "all">("all");
  const [zoomed, setZoomed] = useState<Mockup | null>(null);

  // Only offer filters for categories this project actually produced.
  const categories = useMemo(() => {
    const present = new Set(mockups.map((m) => m.category));
    return (Object.keys(CATEGORY_LABELS) as MockupCategory[]).filter((c) =>
      present.has(c),
    );
  }, [mockups]);

  const visible = useMemo(
    () => (filter === "all" ? mockups : mockups.filter((m) => m.category === filter)),
    [mockups, filter],
  );

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoomed]);

  return (
    <>
      {categories.length > 1 && (
        <div className="scroll-x mb-6 flex gap-2 pb-1" role="tablist">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`Tous (${mockups.length})`}
          />
          {categories.map((category) => (
            <FilterChip
              key={category}
              active={filter === category}
              onClick={() => setFilter(category)}
              label={CATEGORY_LABELS[category]}
            />
          ))}
        </div>
      )}

      <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 [&>*]:mb-4">
        {visible.map((mockup) => (
          <figure
            key={mockup.id}
            className="group relative break-inside-avoid overflow-hidden rounded-xl border border-line bg-white"
          >
            <SvgFrame
              svg={mockup.svg}
              className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            />

            <figcaption className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">
                  {mockup.title}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                  {CATEGORY_LABELS[mockup.category]}
                </p>
              </div>

              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setZoomed(mockup)}
                  aria-label={`Voir ${mockup.title} en plein écran`}
                  className="grid size-8 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:border-ink hover:text-ink"
                >
                  <Maximize2 size={14} />
                </button>
                <button
                  onClick={() => downloadPng(mockup.svg, `${slug(brandName)}-${mockup.id}`, 2)}
                  aria-label={`Télécharger ${mockup.title} en PNG`}
                  className="grid size-8 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:border-ink hover:text-ink"
                >
                  <Download size={14} />
                </button>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-ink/92 p-4 animate-fade sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={zoomed.title}
        >
          <div className="mb-4 flex items-center justify-between gap-4 text-white">
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">
                {zoomed.title}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/65">
                {CATEGORY_LABELS[zoomed.category]} · {FAMILY_FR[zoomed.family] ?? zoomed.family}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => downloadSvg(zoomed.svg, `${slug(brandName)}-${zoomed.id}`)}
                className="rounded-full border border-white/20 px-3.5 py-2 text-[12px] font-bold uppercase tracking-wider text-white/80 transition-colors hover:border-white hover:text-white"
              >
                SVG
              </button>
              <button
                onClick={() => downloadPng(zoomed.svg, `${slug(brandName)}-${zoomed.id}`, 3)}
                className="rounded-full bg-acid px-3.5 py-2 text-[12px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
              >
                PNG HD
              </button>
              <button
                onClick={() => setZoomed(null)}
                aria-label="Fermer"
                className="grid size-9 place-items-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-white hover:text-white"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 place-items-center overflow-auto">
            <SvgFrame
              svg={zoomed.svg}
              className="[&>svg]:h-auto [&>svg]:max-h-[80vh] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
        active
          ? "border-ink bg-ink text-bone"
          : "border-line bg-white text-ink-muted hover:border-ink hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "brand"
  );
}
