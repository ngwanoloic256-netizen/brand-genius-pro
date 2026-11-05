"use client";

import { useMemo, useState } from "react";
import { Download, Info } from "lucide-react";
import { SvgFrame } from "../SvgFrame";
import { downloadPng, downloadSvg } from "@/lib/export/assets";
import {
  defaultSocialContent,
  generateSocialKit,
  type SocialContent,
} from "@/lib/ai/social";
import type { BrandGuide } from "@/lib/types";

const INPUT =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] outline-none transition-colors placeholder:text-ink-muted/70 focus:border-ink";

/**
 * Le kit réseaux sociaux, modifiable en direct.
 *
 * Les quatre champs changent tous les visuels à la fois : le visiteur règle
 * son slogan et son numéro WhatsApp une fois, puis télécharge chaque format.
 */
export function SocialSection({
  guide,
  watermark,
}: {
  guide: BrandGuide;
  watermark: boolean;
}) {
  const defaults = useMemo(() => defaultSocialContent(guide), [guide]);
  const [content, setContent] = useState<SocialContent>(defaults);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const assets = useMemo(
    () => generateSocialKit(guide, { content, watermark }),
    [guide, content, watermark],
  );
  const current = assets[active] ?? assets[0];

  const slug =
    guide.brief.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "marque";

  function update<K extends keyof SocialContent>(key: K, value: string) {
    setContent((c) => ({ ...c, [key]: value }));
  }

  async function png(index: number) {
    const asset = assets[index];
    setBusy(asset.format.id);
    try {
      await downloadPng(asset.svg, `${slug}-${asset.format.id}-${asset.format.width}x${asset.format.height}`, 1);
    } finally {
      setBusy(null);
    }
  }

  const tall = current.format.height > current.format.width;
  const square = current.format.height === current.format.width;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-xl border border-line bg-white p-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-[13px] font-semibold">Message principal</span>
          <input
            id="social-headline"
            className={INPUT}
            value={content.headline}
            maxLength={90}
            onChange={(e) => update("headline", e.target.value)}
            placeholder={defaults.headline}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold">Appel à l’action (story)</span>
          <input
            id="social-cta"
            className={INPUT}
            value={content.cta}
            maxLength={40}
            onChange={(e) => update("cta", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold">Numéro WhatsApp</span>
          <input
            id="social-phone"
            className={INPUT}
            value={content.phone}
            maxLength={24}
            inputMode="tel"
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+237 6 00 00 00 00"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-[13px] font-semibold">Site ou identifiant</span>
          <input
            id="social-handle"
            className={INPUT}
            value={content.handle}
            maxLength={40}
            onChange={(e) => update("handle", e.target.value)}
          />
        </label>
      </div>

      <div className="scroll-x flex gap-2 pb-1" role="tablist" aria-label="Formats">
        {assets.map((asset, i) => (
          <button
            key={asset.format.id}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              i === active
                ? "border-ink bg-ink text-bone"
                : "border-line bg-white text-ink-muted hover:border-ink hover:text-ink"
            }`}
          >
            {asset.format.label}
          </button>
        ))}
      </div>

      <figure className="overflow-hidden rounded-xl border border-line bg-bone-deep p-5 sm:p-6">
        <div className={`mx-auto ${tall ? "max-w-[340px]" : square ? "max-w-[520px]" : "max-w-full"}`}>
          <SvgFrame
            svg={current.svg}
            className="[&>svg]:h-auto [&>svg]:w-full [&>svg]:rounded-lg [&>svg]:shadow-lift"
          />
        </div>
        <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <span className="min-w-0 text-ink-muted">
            <span className="font-semibold text-ink">{current.format.platform}</span> ·{" "}
            {current.format.width} × {current.format.height} px
            <span className="mt-1 flex items-start gap-1.5">
              <Info size={13} className="mt-0.5 shrink-0" />
              {current.format.usage}
            </span>
          </span>
          <span className="flex shrink-0 gap-2">
            <button
              onClick={() => downloadSvg(current.svg, `${slug}-${current.format.id}`)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 font-semibold transition-colors hover:border-ink"
            >
              SVG
            </button>
            <button
              onClick={() => png(active)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 font-semibold text-bone transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Download size={13} /> {busy === current.format.id ? "Export…" : "PNG prêt à publier"}
            </button>
          </span>
        </figcaption>
      </figure>

      {watermark && (
        <p className="rounded-xl border border-line bg-white p-4 text-[13px] leading-relaxed text-ink-muted">
          Offre gratuite : les visuels portent un petit filigrane.{" "}
          <a href="/abonnement" className="font-semibold text-ink underline">
            Passez à Pro
          </a>{" "}
          pour les exporter sans filigrane.
        </p>
      )}
    </div>
  );
}
