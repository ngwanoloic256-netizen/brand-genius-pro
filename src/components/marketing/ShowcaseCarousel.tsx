"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SvgFrame } from "../SvgFrame";

export interface ShowcaseSlide {
  id: string;
  title: string;
  category: string;
  description: string;
  /** Vector artwork composed by the renderer. */
  svg?: string;
  /**
   * A photographic mockup, for surfaces the vector compositor does not cover.
   *
   * Both kinds are the product's own output, so they sit in the same reel
   * rather than in a separate "photos" section: the visitor is being shown what
   * comes out, not how it was made.
   */
  image?: string;
  /** Alt text for `image`. Ignored for `svg`, which carries its own title. */
  alt?: string;
}

/**
 * The showcase reel.
 *
 * Every slide is a mockup this product actually generated, not a stock photo:
 * the claim being made is "it produces these", so the evidence has to be the
 * output itself.
 *
 * Auto-advance stops permanently once the visitor uses the arrows or the dots.
 * A carousel that resumes moving after someone has taken control fights them,
 * and the arrows exist precisely because someone wanted to stop and look.
 */
export function ShowcaseCarousel({ slides }: { slides: ShowcaseSlide[] }) {
  const [index, setIndex] = useState(0);
  const [held, setHold] = useState(false);
  const region = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (next: number) => {
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length],
  );

  const take = useCallback(
    (next: number) => {
      setHold(true);
      go(next);
    },
    [go],
  );

  useEffect(() => {
    if (held || slides.length < 2) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = setInterval(() => go(index + 1), 5000);
    return () => clearInterval(id);
  }, [held, index, go, slides.length]);

  const slide = slides[index];
  if (!slide) return null;

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-iris-soft">
          {slide.category}
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => take(index - 1)}
            aria-label="Exemple précédent"
            className="grid size-12 place-items-center rounded-full border border-white/12 text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:size-14"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => take(index + 1)}
            aria-label="Exemple suivant"
            className="grid size-12 place-items-center rounded-full border border-white/12 text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:size-14"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div
        ref={region}
        aria-live="polite"
        className="relative overflow-hidden rounded-3xl border border-white/8 bg-night-raised"
      >
        <div className="grid min-h-[320px] place-items-center p-5 sm:min-h-[440px] sm:p-10">
          {slides.map((item, i) => (
            <div
              key={item.id}
              className="col-start-1 row-start-1 w-full transition-all duration-700 ease-out"
              style={{
                opacity: i === index ? 1 : 0,
                transform: i === index ? "none" : "scale(0.97)",
                pointerEvents: i === index ? "auto" : "none",
              }}
              aria-hidden={i !== index}
            >
              {item.image ? (
                <div className="grid place-items-center">
                  <Image
                    src={item.image}
                    alt={item.alt ?? item.title}
                    width={1400}
                    height={1400}
                    sizes="(max-width: 640px) 90vw, 640px"
                    className="h-auto max-h-[240px] w-auto max-w-full rounded-xl object-contain sm:max-h-[360px]"
                    // Only the first slide is on screen at load; the rest are
                    // faded out behind it and can wait.
                    priority={i === 0}
                    loading={i === 0 ? undefined : "lazy"}
                  />
                </div>
              ) : (
                <SvgFrame
                  svg={item.svg ?? ""}
                  className="grid place-items-center [&>svg]:h-auto [&>svg]:max-h-[240px] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:rounded-xl sm:[&>svg]:max-h-[360px]"
                />
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-white/8 p-6 sm:p-8">
          <h3 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
            {slide.title}
          </h3>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/60 sm:text-base">
            {slide.description}
          </p>
        </div>

        <div className="absolute right-5 top-5 flex gap-2 sm:right-8 sm:top-8">
          {slides.map((item, i) => (
            <button
              key={item.id}
              onClick={() => take(i)}
              aria-label={`Afficher ${item.title}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === index ? "w-10 bg-iris-bright" : "w-4 bg-white/25 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
