import { Check, X } from "lucide-react";
import type { BrandStrategy } from "@/lib/types";

export function VoiceSection({ strategy }: { strategy: BrandStrategy }) {
  const { voice } = strategy;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-ink p-6 text-bone sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-soft">
          Positionnement
        </p>
        <p className="mt-3 font-display text-[clamp(1.25rem,3vw,1.75rem)] font-bold leading-[1.25] tracking-[-0.02em]">
          {voice.positioning}
        </p>
        <p className="mt-5 border-t border-white/10 pt-5 text-[15px] leading-relaxed text-white/60">
          {strategy.rationale}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-6">
          <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[0.1em]">
            Personnalité
          </h3>
          <ul className="flex flex-wrap gap-2">
            {voice.personality.map((trait) => (
              <li
                key={trait}
                className="rounded-full border border-line bg-bone px-3 py-1.5 text-[13px] font-medium capitalize"
              >
                {trait}
              </li>
            ))}
          </ul>

          <h3 className="mb-2 mt-7 text-[13px] font-bold uppercase tracking-[0.1em]">
            Slogan
          </h3>
          <p className="font-display text-lg font-bold leading-snug">
            {voice.tagline}
          </p>
        </div>

        <ToneList
          title="Écrire comme ceci"
          items={voice.toneDo}
          tone="positive"
          icon={<Check size={13} strokeWidth={3} />}
        />
        <ToneList
          title="Pas comme cela"
          items={voice.toneDont}
          tone="signal"
          icon={<X size={13} strokeWidth={3} />}
        />
      </div>
    </div>
  );
}

function ToneList({
  title,
  items,
  tone,
  icon,
}: {
  title: string;
  items: string[];
  tone: "positive" | "signal";
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
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${badge}`}
            >
              {icon}
            </span>
            <span className="text-[13px] leading-relaxed text-ink-muted">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
