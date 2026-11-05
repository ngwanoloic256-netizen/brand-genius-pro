"use client";

import { useEffect, useState } from "react";
import { SvgFrame } from "../SvgFrame";

/**
 * Hero visual: one logo cycling across real generated mockups.
 *
 * The SVGs are produced by the same pipeline the product ships — nothing here
 * is a stock placeholder image.
 */
export function HeroShowcase({
  logo,
  mockups,
}: {
  logo: string;
  mockups: Array<{ id: string; title: string; svg: string }>;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = setInterval(
      () => setIndex((i) => (i + 1) % mockups.length),
      3200,
    );
    return () => clearInterval(id);
  }, [mockups.length]);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="ml-2 truncate font-mono text-[11px] text-ink-muted">
            {mockups[index]?.title}
          </span>
        </div>

        <div className="relative grid min-h-[280px] place-items-center bg-bone-deep p-4 sm:min-h-[360px]">
          {mockups.map((mockup, i) => (
            <div
              key={mockup.id}
              className="col-start-1 row-start-1 transition-all duration-700"
              style={{
                opacity: i === index ? 1 : 0,
                transform: i === index ? "none" : "scale(0.97)",
                pointerEvents: i === index ? "auto" : "none",
              }}
              aria-hidden={i !== index}
            >
              <SvgFrame
                svg={mockup.svg}
                className="[&>svg]:h-auto [&>svg]:max-h-[300px] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:rounded-lg"
              />
            </div>
          ))}
        </div>
      </div>

      {/* The source mark, pinned as the constant across every scene */}
      <div className="absolute -bottom-6 -left-4 hidden rounded-xl border border-line bg-white p-3 shadow-lift sm:block">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          One mark
        </p>
        <SvgFrame svg={logo} className="[&>svg]:h-12 [&>svg]:w-auto" />
      </div>

      <div
        className="absolute -right-3 -top-4 hidden rounded-full border border-line bg-white px-3 py-1.5 shadow-lift sm:flex sm:items-center sm:gap-2"
        aria-hidden
      >
        <span className="size-1.5 animate-pulse rounded-full bg-positive" />
        <span className="font-mono text-[10px] text-ink-muted">
          {index + 1}/{mockups.length} applications
        </span>
      </div>
    </div>
  );
}
