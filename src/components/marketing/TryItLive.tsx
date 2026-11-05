"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Shuffle } from "lucide-react";
import { darken, lighten, readableOn } from "@/lib/color";
import { advanceWidth } from "@/lib/ai/text-metrics";
import type { PhotoScene } from "@/lib/ai/photo-scenes";

/**
 * Live brand preview on the landing page.
 *
 * Everything here runs in the browser: recolouring a mark is a string
 * substitution and placing it on a backplate is one affine transform, so a
 * visitor can type their own name and watch a real mockup update on every
 * keystroke without a request leaving the page.
 *
 * It is the product's core claim — one mark, applied consistently everywhere —
 * made touchable rather than described.
 */

const HUES = [
  { name: "Marine", hex: "#12376B" },
  { name: "Cobalt", hex: "#2F6BFF" },
  { name: "Pin", hex: "#1F5D4C" },
  { name: "Argile", hex: "#B4552D" },
  { name: "Prune", hex: "#5B2E63" },
  { name: "Encre", hex: "#1B1D22" },
];

const SUGGESTIONS = [
  "Lumen Roasters",
  "North Signal",
  "Verdant Clinic",
  "Atelier Frame",
  "Saveurs de Douala",
];

/**
 * The monogram is built here rather than reusing a server-generated mark.
 *
 * A server mark bakes in the sample brand's initials, so typing "Cafe Vertigo"
 * would show "LR" beside the new wordmark — which reads as a broken preview
 * rather than a live one. Deriving the initials from what the visitor typed
 * keeps the mark and the name telling the same story.
 */
function monogram(name: string, hue: string, accent: string): string {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "B";

  const onHue = readableOn(hue);

  return [
    `<rect x="8" y="8" width="84" height="84" rx="24" fill="${hue}"/>`,
    `<path d="M62 8 H92 V38 Z" fill="${accent}"/>`,
    `<text x="50" y="52" text-anchor="middle" dominant-baseline="central"`,
    ` font-family="var(--font-display)" font-size="${initials.length > 1 ? 34 : 44}"`,
    ` font-weight="800" letter-spacing="-1" fill="${onHue}">${initials}</text>`,
  ].join("");
}

interface TryItLiveProps {
  /** Backplates the preview can cycle through. */
  scenes: PhotoScene[];
}

export function TryItLive({ scenes }: TryItLiveProps) {
  const [name, setName] = useState("Lumen Roasters");
  const [hue, setHue] = useState(HUES[1].hex);
  const [sceneIndex, setSceneIndex] = useState(0);

  const scene = scenes[sceneIndex % scenes.length];

  const palette = useMemo(
    () => [
      hue,
      darken(hue, 0.35),
      lighten(hue, 0.55),
      lighten(hue, 0.86),
      "#101418",
    ],
    [hue],
  );

  const accent = useMemo(() => lighten(hue, 0.3), [hue]);
  const display = name.trim() || "Votre marque";

  // Same mapping the server-side renderer uses: unit square -> placement quad.
  const p = scene.placement;
  const matrix = [
    p.ux * scene.width,
    p.uy * scene.height,
    p.vx * scene.width,
    p.vy * scene.height,
    p.ox * scene.width,
    p.oy * scene.height,
  ].join(" ");

  const onDark = scene.surface === "dark";
  const inkOnSurface = onDark ? "#FFFFFF" : "#101418";
  const markOnSurface = onDark ? "#FFFFFF" : hue;

  // Same measurement the server-side renderer uses, so the preview and the
  // generated mockup place the lockup identically.
  const MARK = 64;
  const GAP = 18;
  const FONT = 34;
  const TRACKING = -0.5;
  // The preview paints in the app's own display face, so measure that one.
  const contentWidth =
    MARK + GAP + advanceWidth(display, FONT, TRACKING, "Bricolage Grotesque");
  const pad = Math.max(8, contentWidth * 0.04);
  const lockupWidth = Math.round(contentWidth + pad * 2);
  const lockupHeight = 72;
  const lockupLeft = (lockupWidth - contentWidth) / 2;

  // Centred "meet" fit into the unit placement square, done by hand so the
  // lockup can live in a <g>, which never clips.
  const fitScale = Math.min(1 / lockupWidth, 1 / lockupHeight);
  const lockupFit = `translate(${((1 - lockupWidth * fitScale) / 2).toFixed(5)}, ${(
    (1 - lockupHeight * fitScale) /
    2
  ).toFixed(5)}) scale(${fitScale.toFixed(6)})`;

  return (
    <div className="glass-night overflow-hidden rounded-3xl">
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Controls */}
        <div className="border-b border-white/10 p-6 md:border-b-0 md:border-r md:border-white/10 md:p-8">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-iris-soft">
            Essayez ici
          </p>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold">
              Nom de la marque
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 28))}
              placeholder="Votre marque"
              className="w-full rounded-xl border border-white/15 bg-white/6 px-3.5 py-2.5 text-[15px] text-white outline-none transition-colors placeholder:text-white/40 focus:border-iris-soft"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setName(suggestion)}
                className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white/70 transition-colors hover:border-white/40 hover:text-white"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <p className="mb-2.5 mt-6 text-[13px] font-semibold">Primary colour</p>
          <div className="flex flex-wrap gap-2">
            {HUES.map((option) => (
              <button
                key={option.hex}
                onClick={() => setHue(option.hex)}
                aria-label={option.name}
                aria-pressed={hue === option.hex}
                className={`size-9 rounded-full transition-transform hover:scale-110 ${
                  hue === option.hex
                    ? "ring-2 ring-white ring-offset-2 ring-offset-[#0c0f1a]"
                    : "ring-1 ring-white/20"
                }`}
                style={{ background: option.hex }}
              />
            ))}
          </div>

          <p className="mb-2.5 mt-6 text-[13px] font-semibold">
            Palette générée
          </p>
          <div className="flex h-9 overflow-hidden rounded-lg">
            {palette.map((swatch) => (
              <span
                key={swatch}
                className="flex-1 transition-colors duration-300"
                style={{ background: swatch }}
              />
            ))}
          </div>

          <button
            onClick={() => setSceneIndex((i) => i + 1)}
            className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-white/70 transition-colors hover:text-white"
          >
            <Shuffle size={14} />
            Autre support
          </button>

          <Link
            href="/projects/new"
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-iris px-5 text-sm font-semibold text-white transition-colors hover:bg-iris-bright"
          >
            Créer l’identité complète
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Live preview */}
        <div className="relative bg-white/[0.04] p-4 sm:p-6">
          <svg
            viewBox={`0 0 ${scene.width} ${scene.height}`}
            className="h-auto w-full rounded-xl"
            role="img"
            aria-label={`${display} sur : ${scene.title.toLowerCase()}`}
          >
            <image
              href={`/mockups/${scene.file}`}
              x={0}
              y={0}
              width={scene.width}
              height={scene.height}
              preserveAspectRatio="xMidYMid slice"
            />
            <g transform={`matrix(${matrix})`} opacity={scene.inkOpacity ?? 0.92}>
              {/* A <g> rather than a nested <svg>: no viewport, so a name the
                  width estimate under-measures paints slightly past the edge
                  instead of losing its last letter. Same centred fit, computed
                  here rather than left to preserveAspectRatio. */}
              <g transform={lockupFit}>
                <g
                  transform={`translate(${lockupLeft.toFixed(2)}, 4) scale(0.64)`}
                  dangerouslySetInnerHTML={{
                    __html: monogram(display, markOnSurface, accent),
                  }}
                />
                <text
                  x={+(lockupLeft + MARK + GAP).toFixed(2)}
                  y={36}
                  dominantBaseline="central"
                  fontFamily="var(--font-display)"
                  fontSize={FONT}
                  fontWeight={700}
                  letterSpacing={TRACKING}
                  fill={inkOnSurface}
                >
                  {display}
                </text>
              </g>
            </g>
          </svg>

          <div className="pointer-events-none absolute bottom-6 right-6 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 backdrop-blur sm:bottom-8 sm:right-8">
            <span
              className="size-2 rounded-full"
              style={{ background: hue }}
            />
            <span className="font-mono text-[10px] text-ink">
              {hue.toUpperCase()}
            </span>
          </div>

          {/* The same mark, shown small, to make the "one mark" point visible */}
          <div className="absolute left-6 top-6 flex items-center gap-2 rounded-xl bg-white/90 px-2.5 py-2 backdrop-blur sm:left-8 sm:top-8">
            <span
              className="grid size-7 place-items-center rounded-lg"
              style={{ background: hue }}
            >
              <span
                className="block size-5"
                dangerouslySetInnerHTML={{
                  __html: `<svg viewBox="0 0 100 100" width="100%" height="100%">${monogram(display, readableOn(hue), hue)}</svg>`,
                }}
              />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
              Same mark
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
