import { Check, X } from "lucide-react";
import type { BrandGuide } from "@/lib/types";
import { SCALE_STEPS } from "@/lib/ai/palette";
import { fr, HARMONY_FR, NEUTRALS_FR, SATURATION_FR } from "@/lib/labels-fr";

const AXES: Array<{
  key: keyof BrandGuide["strategy"]["artDirection"]["personality"];
  left: string;
  right: string;
}> = [
  { key: "seriousPlayful", left: "Sérieuse", right: "Ludique" },
  { key: "classicModern", left: "Classique", right: "Moderne" },
  { key: "massPremium", left: "Grand public", right: "Haut de gamme" },
  { key: "quietLoud", left: "Discrète", right: "Voyante" },
];

/**
 * The art direction, shown as the thing the rest of the guide was derived
 * from rather than as trivia. Everything on this page — the geometry, the type
 * pairing, the colour harmony, which mockups appear — follows from it.
 */
export function ArtDirectionSection({ guide }: { guide: BrandGuide }) {
  const { artDirection: ad, artDirectionRationale, seed } = guide.strategy;

  const tokens: Array<[string, string]> = [
    ["Arrondi des angles", ad.radius >= 999 ? "Complet (pilule)" : `${ad.radius} px`],
    ["Épaisseur de trait", `${ad.stroke} px`],
    ["Échelle typographique", `${ad.type.scale}`],
    ["Harmonie", fr(HARMONY_FR, ad.color.harmony)],
    ["Saturation", fr(SATURATION_FR, ad.color.saturation)],
    ["Neutres", fr(NEUTRALS_FR, ad.color.neutrals)],
    ["Espace blanc", `${Math.round(ad.whitespaceRatio * 100)} %`],
    ["Grille", `${ad.grid.columns} colonnes · gouttière ${ad.grid.gutter} px`],
  ];

  const language: Array<[string, string]> = [
    ["Formes", ad.shapes],
    ["Icônes", ad.iconography],
    ["Images", ad.imagery],
    ["Texture", ad.texture],
    ["Ombre", ad.shadow],
    ["Mise en page", ad.layoutSignature],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-ink p-6 text-bone sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-soft">
              Direction artistique
            </p>
            <h3 className="mt-2 font-display text-[clamp(1.5rem,3vw,2rem)] font-extrabold tracking-[-0.025em]">
              {ad.name}
            </h3>
          </div>
          <p className="font-mono text-[11px] text-white/65">
            graine {seed.toString(16)}
          </p>
        </div>

        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/65">
          {artDirectionRationale}
        </p>

        <div className="mt-7 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {AXES.map(({ key, left, right }) => {
            const value = ad.personality[key];
            return (
              <div key={key}>
                <div className="flex justify-between text-[11px] text-white/65">
                  <span>{left}</span>
                  <span>{right}</span>
                </div>
                <div className="relative mt-1.5 h-1 rounded-full bg-white/15">
                  <span
                    className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft"
                    style={{ left: `${value * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-6">
          <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[0.1em]">
            Variables
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            {tokens.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                  {label}
                </dt>
                <dd className="mt-0.5 font-mono text-[13px] capitalize">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-line bg-white p-6">
          <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[0.1em]">
            Langage visuel
          </h3>
          <dl className="space-y-2.5">
            {language.map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <dt className="w-28 shrink-0 text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                  {label}
                </dt>
                <dd className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-muted">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Tonal scale — what a developer actually needs to implement the brand */}
      <div className="rounded-xl border border-line bg-white p-6">
        <h3 className="mb-1 text-[13px] font-bold uppercase tracking-[0.1em]">
          Nuances de la couleur principale
        </h3>
        <p className="mb-4 text-[13px] text-ink-muted">
          Calculées en OKLCH : chaque palier paraît régulier à l’œil, pas seulement en chiffres.
        </p>

        <div className="scroll-x">
          <div className="flex min-w-[560px] overflow-hidden rounded-lg">
            {SCALE_STEPS.map((step) => (
              <div key={step} className="flex-1">
                <div
                  className="h-16"
                  style={{ background: guide.primaryScale[step] }}
                />
                <div className="px-1 py-1.5 text-center">
                  <p className="font-mono text-[10px] text-ink-muted">{step}</p>
                  <p className="font-mono text-[9px] text-ink-muted">
                    {guide.primaryScale[step]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contrast report — the QC gate, published rather than hidden */}
      <div className="rounded-xl border border-line bg-white p-6">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[0.1em]">
          Contrôles de contraste
        </h3>
        <ul className="space-y-2">
          {guide.contrastReport.map((check) => (
            <li
              key={check.pair}
              className="flex items-center justify-between gap-4 border-b border-line-soft pb-2 last:border-0"
            >
              <span className="flex items-center gap-2.5 text-[13px]">
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full ${
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
                {check.pair}
              </span>
              <span className="font-mono text-[13px] text-ink-muted">
                {check.ratio.toFixed(2)}:1
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
