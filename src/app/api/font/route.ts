import { NextResponse } from "next/server";
import { FONT_FAMILY_NAMES } from "@/lib/ai/fonts";
import { identityFrom, localRateLimit } from "@/lib/rate-limit-window";

/**
 * Serves a brand font as base64 TrueType, for embedding in the exported PDF.
 *
 * This has to be a server route rather than a browser fetch, because Google
 * decides the format from the User-Agent and a browser cannot lie about its
 * own. A modern Chrome is served woff2, which jsPDF cannot parse; an old
 * Android UA is served `format('truetype')`, which it can. Measured:
 *
 *   Chrome 120   -> woff2   5,688 bytes   (unusable)
 *   MSIE 6       -> eot    39,372 bytes   (unusable)
 *   Safari 5     -> woff   18,796 bytes   (unusable)
 *   Android 4.3  -> ttf    40,780 bytes   signature 00010000
 *
 * Without this the PDF sets every specimen in Helvetica, which is a poor thing
 * for a document whose subject is the brand's typeface.
 */

const TRUETYPE_UA =
  "Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-T210R Build/JSS15J) " +
  "AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30";

/** Weights the catalogue actually uses. Anything else is rejected. */
const ALLOWED_WEIGHTS = new Set([300, 400, 500, 600, 700, 800, 900]);

/**
 * Only families the generator can pick are fetchable.
 *
 * The family name is interpolated into a URL this server then requests, so an
 * unchecked value would make the route a general-purpose fetch proxy. The
 * catalogue is the allow-list, which also means it cannot drift from what the
 * app can produce.
 */
const ALLOWED_FAMILIES = new Set(FONT_FAMILY_NAMES);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const family = searchParams.get("family")?.trim() ?? "";
  const weight = Number(searchParams.get("weight") ?? 700);

  if (!ALLOWED_FAMILIES.has(family)) {
    return NextResponse.json(
      { error: "Unknown font family." },
      { status: 400 },
    );
  }
  if (!ALLOWED_WEIGHTS.has(weight)) {
    return NextResponse.json({ error: "Unsupported weight." }, { status: 400 });
  }

  /*
   * Generous, because a single PDF export legitimately asks for two faces and
   * the results are cached for a month — but not absent. This is the only route
   * in the app that makes the server fetch from the internet without costing
   * anything per call, which is exactly the shape that gets used as a free
   * request amplifier if it is left unmetered.
   */
  const { allowed, retryAfterSeconds } = localRateLimit(
    `font:${identityFrom(request)}`,
    30,
    60_000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many font requests." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  try {
    const cssUrl = `https://fonts.googleapis.com/css?family=${encodeURIComponent(
      family,
    )}:${weight}`;
    const cssRes = await fetch(cssUrl, {
      headers: { "User-Agent": TRUETYPE_UA },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!cssRes.ok) throw new Error(`Google Fonts returned ${cssRes.status}`);

    const css = await cssRes.text();
    const match = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (!match) throw new Error("No font file in the stylesheet.");

    const fontRes = await fetch(match[1], {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!fontRes.ok) throw new Error(`Font file returned ${fontRes.status}`);

    const buffer = await fontRes.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 0x00010000 is a TrueType outline; 'true' is the older Apple tag. Anything
    // else means Google served a format jsPDF cannot read, and embedding it
    // would corrupt the document rather than fail loudly.
    const signature =
      (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    if (signature !== 0x00010000 && signature !== 0x74727565) {
      throw new Error(
        `Expected TrueType, got signature 0x${(signature >>> 0).toString(16)}`,
      );
    }

    return NextResponse.json(
      { family, weight, base64: base64From(bytes) },
      {
        headers: {
          "Cache-Control": "public, max-age=2592000, immutable",
        },
      },
    );
  } catch (error) {
    /*
     * The cause chain goes to the server log, never to the client.
     *
     * An earlier version returned it in the response body, which is how a
     * caller came to be told "unable to verify the first certificate" — the
     * shape of this deployment's TLS path, handed to anyone who asks. The
     * detail is what makes the failure diagnosable, so it is still captured;
     * it just belongs on this side of the wire.
     */
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? ` (${error.cause.message})`
        : "";
    console.error(
      `[api/font] ${family} ${weight}: ${
        error instanceof Error ? error.message : String(error)
      }${cause}`,
    );

    return NextResponse.json(
      { error: "Could not fetch the font." },
      { status: 502 },
    );
  }
}

/** Chunked so a large font cannot blow the argument limit of fromCharCode. */
function base64From(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
