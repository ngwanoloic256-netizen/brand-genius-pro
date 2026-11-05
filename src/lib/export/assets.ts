"use client";

/**
 * Client-side asset export.
 *
 * Rasterisation happens in the browser via canvas rather than server-side, so
 * there is no native image binary in the deployment and PNG exports keep their
 * transparent background.
 */

import { inlineExternalImages } from "./inline-images";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoke on the next frame so Safari has finished reading the blob.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

export function downloadSvg(svg: string, filename: string): void {
  const withDeclaration = svg.startsWith("<?xml")
    ? svg
    : `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`;

  triggerDownload(
    new Blob([withDeclaration], { type: "image/svg+xml;charset=utf-8" }),
    `${filename}.svg`,
  );
}

/** Reads width/height from the SVG root so the raster keeps its aspect ratio. */
function intrinsicSize(svg: string): { width: number; height: number } {
  const viewBox = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBox) {
    const parts = viewBox[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }
  return { width: 512, height: 512 };
}

export async function downloadPng(
  svg: string,
  filename: string,
  scale = 4,
): Promise<void> {
  const { width, height } = intrinsicSize(svg);

  // An SVG loaded through `new Image()` cannot fetch external resources, so a
  // mockup's backplate has to be inlined before rasterising or it renders
  // blank. No-op for artwork that references nothing.
  const source = await inlineExternalImages(svg);

  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");

    // No fillRect — leaving the canvas untouched is what preserves alpha.
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!png) throw new Error("Could not encode the PNG.");

    triggerDownload(png, `${filename}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Could not rasterise this SVG in the browser."));
    image.src = src;
  });
}
