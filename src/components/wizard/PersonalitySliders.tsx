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
    left: "Serious",
    right: "Playful",
    hint: "How much licence the brand takes with its own tone.",
  },
  {
    key: "classicModern",
    left: "Classic",
    right: "Modern",
    hint: "Whether it borrows authority from the past or the future.",
  },
  {
    key: "massPremium",
    left: "Mass-market",
    right: "Premium",
    hint: "Who it is priced and positioned for.",
  },
  {
    key: "quietLoud",
    left: "Quiet",
    right: "Loud",
    hint: "How hard it works to be noticed.",
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
            Set the personality myself
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">
            Leave this off and the direction is chosen from your sector and the
            words in your brief — which produces a more committed result than
            four sliders left in the middle.
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
                aria-label={`${left} to ${right}`}
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
