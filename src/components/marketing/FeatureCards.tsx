"use client";

import { useState } from "react";
import { SvgFrame } from "../SvgFrame";
import type { ColorSwatch } from "@/lib/types";

/**
 * The four feature cards. Each one is interactive rather than a static tile —
 * hovering or clicking demonstrates the feature it describes.
 */
export function FeatureCards({
  markVariants,
  palette,
  mockups,
}: {
  markVariants: Array<{ id: string; label: string; svg: string; dark: boolean }>;
  palette: ColorSwatch[];
  mockups: Array<{ id: string; title: string; svg: string }>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <LogoCard variants={markVariants} />
      <ImportCard variants={markVariants} />
      <PaletteCard palette={palette} />
      <MockupCard mockups={mockups} />
    </div>
  );
}

function Card({
  number,
  title,
  body,
  children,
}: {
  number: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:border-ink hover:shadow-lift">
      <div className="grid min-h-[190px] place-items-center overflow-hidden bg-bone-deep p-6">
        {children}
      </div>
      <div className="border-t border-line p-5">
        <p className="font-mono text-[11px] text-ink-muted">{number}</p>
        <h3 className="mt-1.5 font-display text-lg font-bold tracking-[-0.015em]">
          {title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{body}</p>
      </div>
    </article>
  );
}

function LogoCard({
  variants,
}: {
  variants: Array<{ id: string; label: string; svg: string; dark: boolean }>;
}) {
  const [active, setActive] = useState(0);

  return (
    <Card
      number="01"
      title="A logo drawn from your brief"
      body="Vector from the first pixel. One mark, composed into five variants so every surface — light, dark, one-colour, favicon — is covered."
    >
      <div className="w-full">
        <div
          className={`grid min-h-24 place-items-center rounded-xl p-5 transition-colors duration-300 ${
            variants[active]?.dark ? "bg-ink" : "bg-white"
          }`}
        >
          <SvgFrame
            svg={variants[active]?.svg ?? ""}
            className="[&>svg]:max-h-16 [&>svg]:w-auto [&>svg]:max-w-full"
          />
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {variants.map((variant, i) => (
            <button
              key={variant.id}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors ${
                i === active
                  ? "border-ink bg-ink text-bone"
                  : "border-line bg-white text-ink-muted hover:border-ink-faint"
              }`}
            >
              {variant.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ImportCard({
  variants,
}: {
  variants: Array<{ id: string; label: string; svg: string; dark: boolean }>;
}) {
  const [derived, setDerived] = useState(false);

  return (
    <Card
      number="02"
      title="Already have a logo? Start there"
      body="Upload your SVG and the system is derived from it — palette, companion type, variants, and usage rules that match what you already own."
    >
      <div className="flex w-full items-center gap-3">
        <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-ink-faint/40 bg-white p-5">
          <SvgFrame
            svg={variants[0]?.svg ?? ""}
            className="[&>svg]:max-h-12 [&>svg]:w-auto"
          />
          <p className="mt-2 font-mono text-[9px] text-ink-muted">your-logo.svg</p>
        </div>

        <button
          onMouseEnter={() => setDerived(true)}
          onFocus={() => setDerived(true)}
          onClick={() => setDerived((d) => !d)}
          aria-label="Preview the derived system"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-white text-ink-muted transition-transform hover:scale-110"
        >
          →
        </button>

        <div className="grid flex-1 gap-1.5 rounded-xl bg-white p-4">
          {[0, 1, 2, 3].map((row) => (
            <span
              key={row}
              className="block h-3 rounded transition-all duration-500"
              style={{
                background: derived ? "var(--color-ink)" : "var(--color-line)",
                width: derived ? `${100 - row * 14}%` : "40%",
                transitionDelay: `${row * 70}ms`,
                opacity: derived ? 1 - row * 0.18 : 0.5,
              }}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function PaletteCard({ palette }: { palette: ColorSwatch[] }) {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <Card
      number="03"
      title="Colour and type that hold together"
      body="HEX, RGB, and CMYK for every swatch, contrast-checked foregrounds, and font pairings that survive both a headline and a spreadsheet."
    >
      <div className="w-full">
        <div className="flex h-24 overflow-hidden rounded-xl">
          {palette.slice(0, 6).map((swatch, i) => (
            <button
              key={swatch.hex + swatch.name}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              className="relative transition-all duration-300"
              style={{
                background: swatch.hex,
                flex: hover === i ? 2.4 : 1,
              }}
              aria-label={`${swatch.name} ${swatch.hex}`}
            >
              {hover === i && (
                <span
                  className="absolute inset-x-0 bottom-2 font-mono text-[9px]"
                  style={{ color: swatch.onColor }}
                >
                  {swatch.hex}
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="mt-3 text-center font-mono text-[10px] text-ink-muted">
          {hover !== null
            ? `${palette[hover].name} · ${palette[hover].usage.slice(0, 44)}…`
            : "Hover a swatch"}
        </p>
      </div>
    </Card>
  );
}

function MockupCard({
  mockups,
}: {
  mockups: Array<{ id: string; title: string; svg: string }>;
}) {
  const [index, setIndex] = useState(0);

  return (
    <Card
      number="04"
      title="Mockups that never repeat"
      body="Scenes are drawn from distinct composition families — flat-lay, lifestyle, close-up, screen, signage — and no two consecutive mockups share an angle or a support."
    >
      <div className="w-full">
        <div className="grid min-h-28 place-items-center rounded-xl bg-white p-3">
          <SvgFrame
            svg={mockups[index]?.svg ?? ""}
            className="[&>svg]:h-auto [&>svg]:max-h-24 [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:rounded"
          />
        </div>

        <div className="mt-3 flex justify-center gap-1">
          {mockups.map((mockup, i) => (
            <button
              key={mockup.id}
              onMouseEnter={() => setIndex(i)}
              onFocus={() => setIndex(i)}
              onClick={() => setIndex(i)}
              aria-label={mockup.title}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-7 bg-ink" : "w-1.5 bg-line hover:bg-ink-faint"
              }`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
