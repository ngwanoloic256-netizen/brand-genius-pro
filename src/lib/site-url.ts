/**
 * The site's own absolute origin.
 *
 * This exists because `process.env.X ?? fallback` is the wrong guard for
 * deployment platforms. `??` only catches null and undefined, and a Vercel
 * project variable that has been created but left blank arrives as `""` — which
 * sails past the fallback and reaches `new URL("")`, throwing ERR_INVALID_URL
 * while collecting page data and failing the whole build.
 *
 * Two callers need this and both were reading the variable raw:
 *
 *   - `metadataBase`, where a bad value breaks the build outright;
 *   - the signup e-mail's `emailRedirectTo`, where it fails quietly instead —
 *     an empty origin yields the relative "/auth/callback", which Supabase
 *     rejects, so confirmation links stop working in production without
 *     anything going red.
 *
 * So the value is normalised in one place: blank and whitespace-only are
 * treated as absent, a bare host gets a scheme (people paste
 * "my-app.vercel.app"), a trailing slash is dropped, and anything still
 * unparseable falls through to the next candidate rather than throwing.
 */

/** Adds a scheme when the value is a bare host, and validates the result. */
function normalise(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const withScheme = /^https?:\/\//i.test(raw)
    ? raw
    : `https://${raw.replace(/^\/+/, "")}`;

  try {
    const url = new URL(withScheme);
    if (!url.hostname) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Origin candidates, most explicit first.
 *
 * The two VERCEL_* values are injected by the platform, so a deployment still
 * gets correct absolute URLs when the project variable was never set at all.
 * `VERCEL_PROJECT_PRODUCTION_URL` is the stable production domain;
 * `VERCEL_URL` is the per-deployment one, which is right for previews.
 */
export function siteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    const origin = normalise(candidate);
    if (origin) return origin;
  }

  return "http://localhost:3000";
}

/** The same value as a URL, for `metadataBase`. Never throws. */
export function siteUrlObject(): URL {
  return new URL(siteUrl());
}

/** Absolute URL for a path on this site, e.g. `absoluteUrl("/auth/callback")`. */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
