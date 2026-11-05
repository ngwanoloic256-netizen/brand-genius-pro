"use client";

/**
 * Inlines a mockup's backplate into its SVG as a data URI.
 *
 * Both export paths need this, for different reasons:
 *
 *   - PNG download rasterises the SVG by loading it through `new Image()`.
 *     Browsers treat an SVG loaded that way as an isolated document and refuse
 *     to fetch *any* external resource from it, so `<image href="/mockups/…">`
 *     silently renders as nothing — you would get the logo floating on an
 *     empty canvas.
 *   - PDF export hands the SVG to svg2pdf, which has to resolve the same
 *     reference while writing the document.
 *
 * Inlining sidesteps both. It is done only at export time; the SVG rendered on
 * screen keeps the plain URL so the browser caches one copy of each backplate
 * across every mockup that uses it.
 */

const cache = new Map<string, string>();

/** Fetches a same-origin asset and returns it as a `data:` URI. */
async function toDataUri(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url} (${response.status}).`);
  }

  const blob = await response.blob();
  const dataUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${url}.`));
    reader.readAsDataURL(blob);
  });

  cache.set(url, dataUri);
  return dataUri;
}

const IMAGE_HREF = /(<image\b[^>]*?\shref=")(\/[^"]+)(")/g;

/**
 * Replaces every same-origin `<image href="/…">` in the SVG with a data URI.
 *
 * Only root-relative paths are touched: anything already inlined, or pointing
 * at another origin, is left alone rather than fetched.
 */
export async function inlineExternalImages(svg: string): Promise<string> {
  const urls = [...svg.matchAll(IMAGE_HREF)].map((m) => m[2]);
  if (urls.length === 0) return svg;

  const resolved = new Map<string, string>();
  await Promise.all(
    [...new Set(urls)].map(async (url) => {
      try {
        resolved.set(url, await toDataUri(url));
      } catch (err) {
        // A missing backplate must not lose the whole export — the mockup
        // degrades to the artwork alone, which is still worth downloading.
        console.error(err);
      }
    }),
  );

  return svg.replace(IMAGE_HREF, (match, prefix, url, suffix) => {
    const dataUri = resolved.get(url);
    return dataUri ? `${prefix}${dataUri}${suffix}` : match;
  });
}
