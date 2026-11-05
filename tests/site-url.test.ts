import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Deployment-variable handling.
 *
 * A Vercel build failed with ERR_INVALID_URL while collecting page data,
 * because `NEXT_PUBLIC_SITE_URL` existed but was blank: `??` only catches null
 * and undefined, so `""` reached `new URL("")`. These cases are the shapes a
 * dashboard field actually produces — blank, spaces, a pasted bare host, a
 * trailing slash — rather than the shapes a schema would imagine.
 */

const KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "NEXT_PUBLIC_VERCEL_URL",
  "VERCEL_URL",
];

/** Loads the module fresh with exactly the given environment. */
async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const key of KEYS) vi.stubEnv(key, "");
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return import("@/lib/site-url");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("siteUrl", () => {
  it("falls back to localhost when nothing is set", async () => {
    const { siteUrl } = await load({});
    expect(siteUrl()).toBe("http://localhost:3000");
  });

  it.each(["", "   ", "\n", "\t "])(
    "treats %j as absent rather than a URL",
    async (blank) => {
      const { siteUrl, siteUrlObject } = await load({
        NEXT_PUBLIC_SITE_URL: blank,
      });
      // The exact failure that broke the build: this must not throw.
      expect(() => siteUrlObject()).not.toThrow();
      expect(siteUrl()).toBe("http://localhost:3000");
    },
  );

  it("uses an explicit origin", async () => {
    const { siteUrl } = await load({
      NEXT_PUBLIC_SITE_URL: "https://brandgenius.app",
    });
    expect(siteUrl()).toBe("https://brandgenius.app");
  });

  it("adds the scheme to a bare host, which is how people paste it", async () => {
    const { siteUrl } = await load({
      NEXT_PUBLIC_SITE_URL: "brand-genius.vercel.app",
    });
    expect(siteUrl()).toBe("https://brand-genius.vercel.app");
  });

  it("drops a trailing slash, so paths do not double up", async () => {
    const { siteUrl, absoluteUrl } = await load({
      NEXT_PUBLIC_SITE_URL: "https://brandgenius.app/",
    });
    expect(siteUrl()).toBe("https://brandgenius.app");
    expect(absoluteUrl("/auth/callback")).toBe(
      "https://brandgenius.app/auth/callback",
    );
  });

  it("trims surrounding whitespace", async () => {
    const { siteUrl } = await load({
      NEXT_PUBLIC_SITE_URL: "  https://brandgenius.app  ",
    });
    expect(siteUrl()).toBe("https://brandgenius.app");
  });

  it("falls through to the platform's own variables", async () => {
    const { siteUrl } = await load({
      NEXT_PUBLIC_SITE_URL: "",
      VERCEL_PROJECT_PRODUCTION_URL: "brand-genius.vercel.app",
    });
    expect(siteUrl()).toBe("https://brand-genius.vercel.app");
  });

  it("prefers the explicit variable over the platform's", async () => {
    const { siteUrl } = await load({
      NEXT_PUBLIC_SITE_URL: "https://brandgenius.app",
      VERCEL_PROJECT_PRODUCTION_URL: "brand-genius.vercel.app",
    });
    expect(siteUrl()).toBe("https://brandgenius.app");
  });

  it("skips an unparseable value instead of throwing", async () => {
    const { siteUrl } = await load({
      NEXT_PUBLIC_SITE_URL: "http://",
      VERCEL_URL: "brand-genius.vercel.app",
    });
    expect(siteUrl()).toBe("https://brand-genius.vercel.app");
  });

  it("never throws, whatever the value", async () => {
    for (const value of ["", " ", "://", "http://", "not a url", "]["]) {
      const { siteUrlObject } = await load({ NEXT_PUBLIC_SITE_URL: value });
      expect(() => siteUrlObject(), `value: ${JSON.stringify(value)}`).not.toThrow();
    }
  });
});

describe("absoluteUrl", () => {
  it("joins a path with or without its leading slash", async () => {
    const { absoluteUrl } = await load({
      NEXT_PUBLIC_SITE_URL: "https://brandgenius.app",
    });
    expect(absoluteUrl("/auth/callback")).toBe(
      "https://brandgenius.app/auth/callback",
    );
    expect(absoluteUrl("auth/callback")).toBe(
      "https://brandgenius.app/auth/callback",
    );
  });

  it("stays absolute when the variable is blank", async () => {
    // The quiet half of the bug: a relative emailRedirectTo is rejected by
    // Supabase, so confirmation links break without failing the build.
    const { absoluteUrl } = await load({ NEXT_PUBLIC_SITE_URL: "" });
    const link = absoluteUrl("/auth/callback?next=%2Fdashboard");
    expect(link.startsWith("http")).toBe(true);
    expect(link).not.toMatch(/^\/auth/);
  });
});

describe("supabase config", () => {
  async function loadConfig(env: Record<string, string | undefined>) {
    vi.resetModules();
    for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
      if (env[key] === undefined) delete process.env[key];
      else process.env[key] = env[key];
    }
    return import("@/lib/supabase/config");
  }

  it("is unconfigured when the values are missing", async () => {
    const { isSupabaseConfigured } = await loadConfig({});
    expect(isSupabaseConfigured()).toBe(false);
  });

  it.each(["", "   "])(
    "treats %j as unconfigured rather than passing it on",
    async (blank) => {
      // Boolean(" ") is true, so whitespace used to reach createServerClient,
      // which parses the URL and throws — from the proxy, on every request.
      const { isSupabaseConfigured } = await loadConfig({
        NEXT_PUBLIC_SUPABASE_URL: blank,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: blank,
      });
      expect(isSupabaseConfigured()).toBe(false);
    },
  );

  it("rejects a value that is not a parseable URL", async () => {
    const { isSupabaseConfigured } = await loadConfig({
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("accepts a real project URL", async () => {
    const { isSupabaseConfigured, SUPABASE_URL } = await loadConfig({
      NEXT_PUBLIC_SUPABASE_URL: "  https://abcdefgh.supabase.co  ",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "  anon-key  ",
    });
    expect(isSupabaseConfigured()).toBe(true);
    expect(SUPABASE_URL).toBe("https://abcdefgh.supabase.co");
  });
});
