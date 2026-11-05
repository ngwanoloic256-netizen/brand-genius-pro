"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SvgFrame } from "../SvgFrame";
import type { ShowcaseSlide } from "./ShowcaseCarousel";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The surfaces, dragged past the viewport by vertical scroll.
 *
 * The page claims "one mark, every surface". A carousel asserts that; scrolling
 * the mark through the surfaces in one unbroken movement demonstrates it, and
 * the continuity is the argument — you never see the mark cut away and come
 * back, so it reads as one identity rather than a set of stills.
 *
 * This is the one thing here that CSS genuinely cannot do: the horizontal
 * position is a function of vertical scroll offset, sampled continuously.
 *
 * It degrades rather than breaks. Below 768px, and for anyone who asked for
 * reduced motion, no ScrollTrigger is created at all and the same markup is a
 * plain horizontally scrollable strip — pinning a section steals the scrollbar,
 * which is a poor trade on a phone and an actively hostile one if you have
 * already said you do not want motion.
 */
export function SurfaceScroller({ slides }: { slides: ShowcaseSlide[] }) {
  const section = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          const el = track.current;
          if (!el) return;

          /*
           * Distance is measured, not guessed, and re-measured on refresh —
           * `invalidateOnRefresh` re-runs these functions rather than baking in
           * whatever the first layout happened to be.
           *
           * Measured against the viewport rather than the wrapper. The wrapper
           * is inset by the page gutter, so subtracting its width left the last
           * panel 293px past the right edge at the end of the scroll: you could
           * scroll the whole section and never fully see the final surface. The
           * track starts at the wrapper's left edge, so the travel needed is its
           * full width minus what actually fits on screen from that point.
           */
          /*
           * How far the track has to travel for its right edge to meet the
           * right edge of the viewport.
           *
           * Measured against the viewport, not the wrapper: the wrapper is inset
           * by the page gutter, so subtracting its width would stop the travel a
           * gutter short and leave the final panel hanging off screen.
           *
           * Verified in the browser at 1280px — content 3212, gutter 32, so the
           * track ends at -1964 and the last panel's right edge lands exactly on
           * the viewport edge.
           */
          const distance = () => {
            const left = el.getBoundingClientRect().left + window.scrollX;
            const visible = window.innerWidth - left;
            return Math.max(0, el.scrollWidth - visible);
          };

          gsap.to(el, {
            x: () => -distance(),
            // Required: any other ease breaks the 1:1 map between scroll
            // position and horizontal position.
            ease: "none",
            scrollTrigger: {
              trigger: section.current,
              pin: true,
              scrub: 1,
              start: "top top",
              end: () => `+=${distance()}`,
              invalidateOnRefresh: true,
            },
          });

          /*
           * Resize refreshes automatically; a web font arriving does not. Panel
           * widths are viewport-derived so images cannot move them, but the
           * captions are set in the display face, and a font swap changes their
           * height and therefore the pinned section's. One refresh once the
           * fonts have settled, as the ScrollTrigger guidance asks for.
           */
          document.fonts?.ready.then(() => ScrollTrigger.refresh());
        },
      );

      return () => mm.revert();
    },
    { scope: section },
  );

  return (
    <div ref={section} className="relative overflow-hidden">
      {/*
        Focusable and named, because replacing the carousel took the keyboard
        affordance with it.

        On the pinned desktop path the strip is driven by page scroll, so arrow
        keys already work — they scroll the page, which drives the tween. On the
        fallback path it is an `overflow-x: auto` region, and a scroll container
        with no tabindex cannot be reached by keyboard at all in several
        browsers: the content was simply unreachable without a pointer. The
        accessible name also gives a screen reader something to announce when
        entering the list, which the unlabelled <ul> did not.
      */}
      <ul
        ref={track}
        tabIndex={0}
        aria-label="BRAND GENIUS appliqué sur différents supports"
        className="scroll-x flex gap-5 pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-iris-soft md:overflow-visible"
      >
        {slides.map((slide, i) => (
          <li
            key={slide.id}
            className="w-[78vw] shrink-0 sm:w-[56vw] md:w-[38vw] lg:w-[30vw]"
          >
            <figure className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/8 bg-night-raised">
              <div className="grid flex-1 place-items-center p-6 sm:p-8">
                {slide.image ? (
                  <Image
                    src={slide.image}
                    alt={slide.alt ?? slide.title}
                    width={1400}
                    height={1400}
                    sizes="(max-width: 768px) 78vw, 38vw"
                    className="h-auto max-h-[220px] w-auto max-w-full rounded-xl object-contain sm:max-h-[300px]"
                    priority={i < 2}
                    loading={i < 2 ? undefined : "lazy"}
                  />
                ) : (
                  <SvgFrame
                    svg={slide.svg ?? ""}
                    className="grid place-items-center [&>svg]:h-auto [&>svg]:max-h-[220px] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:rounded-xl sm:[&>svg]:max-h-[300px]"
                  />
                )}
              </div>

              <figcaption className="border-t border-white/8 p-5 sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-iris-soft">
                  {slide.category}
                </p>
                <h3 className="mt-2 font-display text-lg font-bold tracking-[-0.02em] sm:text-xl">
                  {slide.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-white/55">
                  {slide.description}
                </p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
