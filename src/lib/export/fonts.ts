"use client";

import type { jsPDF } from "jspdf";
import type { BrandGuide } from "../types";
import { primaryFamily } from "../ai/text-metrics";

/**
 * Embeds the brand's own typefaces into an exported PDF.
 *
 * The guide's whole subject is the typeface, so setting its specimens in
 * Helvetica undercut the document. `/api/font` returns the real TrueType file
 * (see that route for why the format negotiation has to happen server-side)
 * and jsPDF embeds it.
 *
 * Every failure here is non-fatal by design: a font that will not load leaves
 * that one style on Helvetica and the export still completes. Losing the whole
 * document because a CDN was slow would be a much worse trade.
 */

const cache = new Map<string, Promise<string | null>>();

function key(family: string, weight: number): string {
  return `${family}::${weight}`;
}

async function fetchFont(
  family: string,
  weight: number,
): Promise<string | null> {
  const existing = cache.get(key(family, weight));
  if (existing) return existing;

  const request = (async () => {
    try {
      const res = await fetch(
        `/api/font?family=${encodeURIComponent(family)}&weight=${weight}`,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { base64?: string };
      return data.base64 ?? null;
    } catch {
      return null;
    }
  })();

  cache.set(key(family, weight), request);
  return request;
}

/** A font registered on the document, and the name to pass to `setFont`. */
export interface EmbeddedFonts {
  /** Family name for the display role, or "helvetica" if it could not load. */
  display: string;
  /** Family name for body copy, or "helvetica". */
  body: string;
  /** True when at least one brand family is genuinely embedded. */
  anyEmbedded: boolean;
  /** Families that could not be embedded, for an honest note in the document. */
  missing: string[];
}

/**
 * Loads the guide's display and body families and registers them on `doc`.
 *
 * Both roles are fetched in parallel; the whole step is bounded so a hanging
 * request cannot stall the export.
 */
export async function embedBrandFonts(
  doc: jsPDF,
  guide: BrandGuide,
  timeoutMs = 12_000,
): Promise<EmbeddedFonts> {
  const display = guide.typography.find((t) => t.role === "display");
  const body =
    guide.typography.find((t) => t.role === "body") ??
    guide.typography.find((t) => t.role === "heading");

  const wanted = [
    {
      role: "display" as const,
      family: primaryFamily(display?.stack ?? display?.family ?? ""),
      weight: display ? Math.max(...display.weights) : 700,
    },
    {
      role: "body" as const,
      family: primaryFamily(body?.stack ?? body?.family ?? ""),
      weight: 400,
    },
  ].filter((entry) => entry.family);

  const result: EmbeddedFonts = {
    display: "helvetica",
    body: "helvetica",
    anyEmbedded: false,
    missing: [],
  };

  const work = Promise.all(
    wanted.map(async (entry) => {
      const base64 = await fetchFont(entry.family, entry.weight);
      if (!base64) {
        result.missing.push(entry.family);
        return;
      }
      try {
        const file = `${entry.family.replace(/\s+/g, "")}-${entry.weight}.ttf`;
        doc.addFileToVFS(file, base64);
        doc.addFont(file, entry.family, "normal");
        result[entry.role] = entry.family;
        result.anyEmbedded = true;
      } catch {
        result.missing.push(entry.family);
      }
    }),
  );

  await Promise.race([
    work,
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);

  return result;
}
