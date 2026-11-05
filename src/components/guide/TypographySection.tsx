import { ExternalLink } from "lucide-react";
import type { BrandGuide, TypeStyle } from "@/lib/types";

const ROLE_LABELS: Record<TypeStyle["role"], string> = {
  display: "Display",
  heading: "Headings",
  body: "Body",
  data: "Data",
};

/**
 * Type specimen. Every sample uses the brand's own words rather than lorem
 * ipsum, so the pairing is judged on the copy it will actually set.
 */
export function TypographySection({ guide }: { guide: BrandGuide }) {
  const { typography, strategy, brief } = guide;

  const samples: Record<TypeStyle["role"], string> = {
    display: brief.name,
    heading: strategy.voice.tagline,
    body: strategy.voice.positioning,
    data: `${brief.name.toUpperCase()} · EST. ${new Date().getFullYear()} · ${strategy.sector.toUpperCase()}`,
  };

  return (
    <div className="space-y-4">
      {typography.map((style) => (
        <article
          key={style.role}
          className="overflow-hidden rounded-xl border border-line bg-white"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                {ROLE_LABELS[style.role]}
              </span>
              <span className="font-display text-[15px] font-bold">
                {style.family}
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                {style.weights.join(" / ")}
              </span>
            </div>

            {style.googleFontsHref && (
              <a
                href={style.googleFontsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted transition-colors hover:text-ink"
              >
                Google Fonts
                <ExternalLink size={13} />
              </a>
            )}
          </header>

          <div className="px-5 py-6">
            <p
              className="break-words"
              style={{
                fontFamily: style.stack,
                fontSize: `clamp(${Math.max(18, style.sizePx * 0.5)}px, ${style.sizePx / 14}vw, ${style.sizePx}px)`,
                fontWeight: Math.max(...style.weights),
                lineHeight: style.lineHeight,
                letterSpacing: `${style.letterSpacingEm}em`,
              }}
            >
              {samples[style.role]}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line-soft pt-4 font-mono text-[11px] text-ink-muted sm:grid-cols-4">
              <div>
                <dt className="text-ink-muted">Size</dt>
                <dd>{style.sizePx}px</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Line height</dt>
                <dd>{style.lineHeight}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Tracking</dt>
                <dd>{style.letterSpacingEm}em</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Weights</dt>
                <dd>{style.weights.join(", ")}</dd>
              </div>
            </dl>

            <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
              {style.usage}
            </p>
          </div>
        </article>
      ))}

      {/* Full hierarchy in one block, set in the brand's own voice */}
      <div className="rounded-xl border border-line bg-white p-6 sm:p-8">
        <p className="text-eyebrow mb-5">Hierarchy</p>
        <Hierarchy guide={guide} />
      </div>
    </div>
  );
}

function Hierarchy({ guide }: { guide: BrandGuide }) {
  const get = (role: TypeStyle["role"]) =>
    guide.typography.find((t) => t.role === role) ?? guide.typography[0];

  const display = get("display");
  const heading = get("heading");
  const body = get("body");
  const data = get("data");

  return (
    <div className="space-y-4">
      <h3
        style={{
          fontFamily: display.stack,
          fontWeight: Math.max(...display.weights),
          fontSize: "clamp(1.75rem, 5vw, 3rem)",
          lineHeight: display.lineHeight,
          letterSpacing: `${display.letterSpacingEm}em`,
        }}
      >
        {guide.brief.name}
      </h3>

      <h4
        style={{
          fontFamily: heading.stack,
          fontWeight: Math.max(...heading.weights),
          fontSize: "clamp(1.125rem, 2.5vw, 1.5rem)",
          lineHeight: heading.lineHeight,
          letterSpacing: `${heading.letterSpacingEm}em`,
        }}
      >
        {guide.strategy.voice.tagline}
      </h4>

      <p
        className="max-w-2xl"
        style={{
          fontFamily: body.stack,
          fontWeight: body.weights[0],
          fontSize: `${body.sizePx}px`,
          lineHeight: body.lineHeight,
        }}
      >
        {guide.strategy.rationale}
      </p>

      <p
        className="text-ink-muted"
        style={{
          fontFamily: data.stack,
          fontSize: `${data.sizePx - 2}px`,
          letterSpacing: `${data.letterSpacingEm}em`,
        }}
      >
        {guide.strategy.voice.personality.join(" · ").toUpperCase()}
      </p>
    </div>
  );
}
