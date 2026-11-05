/**
 * The in-process half of rate limiting.
 *
 * Split out from `rate-limit.ts` because that module is `server-only` — it
 * reaches the Postgres ledger through the Supabase server client. Everything
 * here is a pure function over a module-level Map, so routes that need only the
 * cheap window (and the tests that cover them) can import it without dragging
 * the database client and its `server-only` guard along.
 *
 * `rate-limit.ts` re-exports these, so existing callers are unaffected.
 */

/** Burst ceiling applied per identity across all generation kinds. */
export const BURST = { limit: 8, windowMs: 60_000 };

const hits = new Map<string, number[]>();

export function slidingWindow(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= limit) {
    const oldest = recent[0];
    return { allowed: false, retryAfterMs: oldest + windowMs - now };
  }

  recent.push(now);
  hits.set(key, recent);

  // Opportunistic cleanup so the map cannot grow without bound.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => t <= cutoff)) hits.delete(k);
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}

/**
 * In-process limiting for routes that make outbound requests but cost nothing
 * per call.
 *
 * The generation endpoints spend money, so they get the durable Postgres ledger
 * as well. `/api/font` only makes Google fetch a file we then cache, so a
 * per-instance window is the right weight — but it must not be *unlimited*,
 * because an unmetered endpoint that makes the server issue outbound requests
 * is a free amplifier no matter how cheap each request is.
 */
export function localRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const { allowed, retryAfterMs } = slidingWindow(key, limit, windowMs);
  return {
    allowed,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
  };
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterMs: number) {
    const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    super(
      `Rate limit reached. Try again in ${seconds > 60 ? `${Math.ceil(seconds / 60)} minutes` : `${seconds} seconds`}.`,
    );
    this.name = "RateLimitError";
    this.retryAfterSeconds = seconds;
  }
}

/**
 * Derives the rate-limit identity: the authenticated user when there is one,
 * otherwise the client IP taken from the proxy headers.
 */
export function identityFrom(request: Request, userId?: string | null): string {
  if (userId) return `user:${userId}`;

  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `ip:${ip}`;
}

/** Reset helper for tests; never called by application code. */
export function __resetRateLimitWindows(): void {
  hits.clear();
}
