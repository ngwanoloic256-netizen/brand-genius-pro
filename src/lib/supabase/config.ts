/**
 * Supabase configuration.
 *
 * The whole app is designed to run without credentials — in that mode projects
 * live in an in-memory store so the product can be explored end to end before
 * a database exists. `isSupabaseConfigured()` is the switch.
 *
 * The values are trimmed and the URL is parsed before either is believed. A
 * deployment variable that exists but holds blank or whitespace is the common
 * way this goes wrong: `?? ""` does not catch it, `Boolean(" ")` is true, and
 * the credentials then reach `createServerClient`, which parses the URL and
 * throws — from the proxy, so on every request rather than in one place.
 * Treating an unusable value as "not configured" degrades to demo mode, which
 * is the behaviour the app already has for no credentials at all.
 */

function cleaned(value: string | undefined): string {
  return value?.trim() ?? "";
}

export const SUPABASE_URL = cleaned(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = cleaned(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** True only when both values are present and the URL is actually parseable. */
export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const { protocol, hostname } = new URL(SUPABASE_URL);
    return Boolean(hostname) && (protocol === "https:" || protocol === "http:");
  } catch {
    return false;
  }
}

export const ASSETS_BUCKET = "brand-assets";
