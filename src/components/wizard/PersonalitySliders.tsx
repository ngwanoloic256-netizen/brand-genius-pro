"use client";

import type { Personality } from "@/lib/ai/art-direction";

/**
 * The four personality axes.
 *
 * They are optional on purpose. Leaving them untouched is not "no opinion" —
 * it tells the engine to commit to whatever the sector and the brief's own
 * words point at, rather than averaging toward a safe middle. The copy says so,
 * because a user who thinks the sliders are required will centre them all and
 * get exactly the blandness the system is built to avoid.
 */

const AXES: Array<{
  key: keyof Personality;
  left: string;
  right: string;
  hint: string;
}> = [
  {
    key: "seriousPlayful",
    left: "Sérieuse",
    right: "Ludique",
    hint: "La liberté que la marque prend avec son ton.",
  },
  {
    key: "classicModern",
    left: "Classique",
    right: "Moderne",
    hint: "Elle s’appuie sur la tradition ou sur l’avenir.",
  },
  {
    key: "massPremium",
    left: "Grand public",
    right: "Haut de gamme",
    hint: "À qui s’adressent son prix et son positionnement.",
  },
  {
    key: "quietLoud",
    left: "Discrète",
    right: "Voyante",
    hint: "À quel point elle cherche à se faire remarquer.",
  },
];

export function PersonalitySliders({
  value,
  onChange,
  enabled,
  onToggle,
}: {
  value: Personality;
  onChange: (next: Personality) => void;
  enabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 size-4 accent-[var(--color-acid)]"
        />
        <span>
          <span className="block text-[13px] font-semibold">
            Je règle la personnalité moi-même
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">
            Si vous laissez cette option désactivée, la direction est choisie selon votre secteur et les mots de votre brief, ce qui donne un résultat plus affirmé que quatre curseurs au milieu.
          </span>
        </span>
      </label>

      {enabled && (
        <div className="mt-6 grid gap-5 animate-rise">
          {AXES.map(({ key, left, right, hint }) => (
            <div key={key}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-medium">{left}</span>
                <span className="font-medium">{right}</span>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(value[key] * 100)}
                onChange={(e) =>
                  onChange({ ...value, [key]: Number(e.target.value) / 100 })
                }
                aria-label={`De ${left} à ${right}`}
                className="mt-2 w-full accent-[var(--color-acid)]"
              />

              <p className="mt-1 text-[12px] text-ink-muted">{hint}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
