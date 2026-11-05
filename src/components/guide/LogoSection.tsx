"use client";

import { Download } from "lucide-react";
import { SvgFrame } from "../SvgFrame";
import { downloadSvg, downloadPng } from "@/lib/export/assets";
import type { LogoVariant } from "@/lib/types";

const BACKGROUNDS: Record<LogoVariant["background"], string> = {
  light: "bg-white",
  neutral: "bg-bone-deep",
  dark: "bg-ink",
};

export function LogoSection({
  variants,
  brandName,
}: {
  variants: LogoVariant[];
  brandName: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {variants.map((variant) => (
        <article
          key={variant.id}
          className="overflow-hidden rounded-xl border border-line bg-white"
        >
          <div
            className={`grid min-h-44 place-items-center p-8 ${BACKGROUNDS[variant.background]}`}
          >
            <SvgFrame
              svg={variant.svg}
              className="[&>svg]:max-h-24 [&>svg]:w-auto [&>svg]:max-w-full"
            />
          </div>

          <div className="border-t border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold">{variant.label}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                  {variant.usage}
                </p>
              </div>

              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() =>
                    downloadSvg(variant.svg, `${slug(brandName)}-${variant.id}`)
                  }
                  className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted transition-colors hover:border-ink hover:text-ink"
                  title="Download SVG"
                >
                  SVG
                </button>
                <button
                  onClick={() =>
                    downloadPng(variant.svg, `${slug(brandName)}-${variant.id}`)
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted transition-colors hover:border-ink hover:text-ink"
                  title="Download PNG at 4× with a transparent background"
                >
                  <Download size={11} />
                  PNG
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
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
