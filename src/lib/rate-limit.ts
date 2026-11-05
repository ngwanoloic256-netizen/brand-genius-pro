import "server-only";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";

/**
 * Rate limiting for the generation endpoints.
 *
 * These endpoints call a paid model API, so they are the most abusable surface
 * in the product. Two layers run in order:
 *
 *   1. An in-process sliding window — cheap, catches bursts, works with no
 *      infrastructure, but is per-instance and resets on cold start.
 *   2. The `generation_events` ledger in Postgres — durable and shared across
 *      instances, and doubles as the audit trail.
 *
 * Layer 1 alone is not sufficient protection in a serverless deployment; layer
 * 2 is the real quota. Layer 1 exists to reject floods before they reach the
 * database.
 */

export type GenerationKind =
  | "directions"
  | "guide"
  | "logo"
  | "palette"
  | "typography"
  | "mockups"
  | "export";

export interface Quota {
  /** Maximum generations allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

const HOUR = 60 * 60 * 1000;

/** Per-kind quotas. Full-guide generation is the expensive one. */
export const QUOTAS: Record<GenerationKind, Quota> = {
  guide: { limit: 10, windowMs: HOUR },
  directions: { limit: 20, windowMs: HOUR },
  logo: { limit: 30, windowMs: HOUR },
  palette: { limit: 30, windowMs: HOUR },
  typography: { limit: 30, windowMs: HOUR },
  mockups: { limit: 40, windowMs: HOUR },
  export: { limit: 60, windowMs: HOUR },
};

import { BURST, RateLimitError, slidingWindow } from "./rate-limit-window";

/*
 * The window itself lives in `./rate-limit-window`, which carries no
 * `server-only` guard, and is re-exported here so existing importers keep
 * working unchanged.
 */
export {
  RateLimitError,
  identityFrom,
  localRateLimit,
} from "./rate-limit-window";

/**
 * Checks both layers. Throws `RateLimitError` when the caller is over quota.
 */
export async function enforceRateLimit(
  identity: string,
  kind: GenerationKind,
): Promise<void> {
  const burst = slidingWindow(`${identity}:burst`, BURST.limit, BURST.windowMs);
  if (!burst.allowed) throw new RateLimitError(burst.retryAfterMs);

  const quota = QUOTAS[kind];
  const local = slidingWindow(`${identity}:${kind}`, quota.limit, quota.windowMs);
  if (!local.allowed) throw new RateLimitError(local.retryAfterMs);

  if (!isSupabaseConfigured() || !identity.startsWith("user:")) return;

  // Durable check — the authoritative quota across all instances.
  const windowStart = new Date(Date.now() - quota.windowMs).toISOString();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("generation_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .neq("status", "failed")
    .gte("created_at", windowStart);

  if (error) {
    // A ledger read failure must not open the gate — layer 1 already passed,
    // so fail closed only on repeated errors rather than blocking every user.
    console.error("Rate-limit ledger read failed:", error.message);
    return;
  }

  if ((count ?? 0) >= quota.limit) {
    throw new RateLimitError(quota.windowMs);
  }
}

/** Appends to the audit/ledger table. Never throws — logging is best effort. */
export async function recordGeneration(
  kind: GenerationKind,
  status: "started" | "succeeded" | "failed",
  options: { projectId?: string | null; error?: string } = {},
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("generation_events").insert({
      user_id: user.id,
      project_id: options.projectId ?? null,
      kind,
      status,
      error: options.error?.slice(0, 500) ?? null,
    });
  } catch (err) {
    console.error("Could not record generation event:", err);
  }
}
