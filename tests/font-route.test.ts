import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/font/route";
import { FONT_FAMILY_NAMES } from "@/lib/ai/fonts";
import { __resetRateLimitWindows } from "@/lib/rate-limit-window";

/**
 * The font route is a fetch proxy with an allow-list.
 *
 * It interpolates a caller-supplied family name into a URL the server then
 * requests, so the allow-list is the only thing standing between it and a
 * general-purpose SSRF gadget. Binding that list to the font catalogue means it
 * cannot drift from what the app can actually produce, and these tests hold the
 * boundary rather than trusting the shape of the input.
 */

function request(query: string): Request {
  return new Request(`http://localhost:3000/api/font?${query}`);
}

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
  // The sliding window is module-level state; without this the tests would
  // pass or fail depending on the order they happened to run in.
  __resetRateLimitWindows();
});

describe("font route input handling", () => {
  it("rejects a family outside the catalogue", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;

    const res = await GET(request("family=Comic%20Sans%20MS&weight=700"));

    expect(res.status).toBe(400);
    // The point is not just the status: nothing may leave the server.
    expect(spy).not.toHaveBeenCalled();
  });

  it.each([
    "family=../../etc/passwd&weight=700",
    "family=https://evil.example.com/&weight=700",
    "family=Archivo%0d%0aX-Injected:%201&weight=700",
    "family=&weight=700",
  ])("rejects %s without making a request", async (query) => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;

    const res = await GET(request(query));

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects a weight outside the catalogue's range", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;

    const res = await GET(request("family=Archivo&weight=123"));

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("accepts every family the generator can pick", async () => {
    // Guards against the allow-list and the catalogue drifting apart: if a
    // family the app can choose were rejected here, its PDF would silently
    // fall back to Helvetica.
    for (const family of FONT_FAMILY_NAMES.slice(0, 5)) {
      globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("googleapis")) {
          return new Response(
            `@font-face{src:url(https://fonts.gstatic.com/s/x.ttf) format('truetype')}`,
          );
        }
        // 0x00010000 — a minimal TrueType signature.
        return new Response(new Uint8Array([0, 1, 0, 0, 9, 9, 9, 9]));
      }) as unknown as typeof fetch;

      const res = await GET(
        request(`family=${encodeURIComponent(family)}&weight=700`),
      );
      expect(res.status, `${family} was rejected`).toBe(200);
    }
  });
});

describe("font route rate limiting", () => {
  it("stops a caller hammering the outbound fetch", async () => {
    /*
     * This is the only route that makes the server fetch from the internet at
     * no cost per call, which is the shape that gets used as a free request
     * amplifier. A PDF export legitimately asks for two faces, so the ceiling
     * is generous — but it exists.
     */
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("googleapis")
        ? new Response(
            `@font-face{src:url(https://fonts.gstatic.com/s/x.ttf) format('truetype')}`,
          )
        : new Response(new Uint8Array([0, 1, 0, 0, 1, 2, 3, 4])),
    ) as unknown as typeof fetch;

    const statuses: number[] = [];
    for (let i = 0; i < 34; i += 1) {
      const res = await GET(request("family=Archivo&weight=700"));
      statuses.push(res.status);
    }

    expect(statuses.filter((s) => s === 200).length).toBe(30);
    expect(statuses.filter((s) => s === 429).length).toBe(4);
  });

  it("tells a throttled caller when to come back", async () => {
    globalThis.fetch = vi.fn(async () => new Response("")) as unknown as typeof fetch;

    let last: Response | undefined;
    for (let i = 0; i < 32; i += 1) {
      last = await GET(request("family=Archivo&weight=700"));
    }

    expect(last?.status).toBe(429);
    expect(Number(last?.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});

describe("font route format handling", () => {
  it("refuses a file that is not TrueType", async () => {
    // Google serves woff2 to modern browsers and eot to old IE. Embedding
    // either would corrupt the PDF rather than fail, so the signature is
    // checked before the bytes are handed back.
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("googleapis")) {
        return new Response(
          `@font-face{src:url(https://fonts.gstatic.com/s/x.woff2) format('woff2')}`,
        );
      }
      // 'wOF2'
      return new Response(new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0, 0, 0, 0]));
    }) as unknown as typeof fetch;

    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(request("family=Archivo&weight=700"));
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(502);
    // The caller is told it failed, not what the server saw.
    expect(body.error).toBe("Could not fetch the font.");
    expect(body.error).not.toMatch(/woff|signature|0x/i);
    // ...but the detail still has to reach the log, or it is undiagnosable.
    expect(logged).toHaveBeenCalledWith(
      expect.stringMatching(/TrueType/i),
    );
  });

  it("returns base64 that round-trips to the original bytes", async () => {
    const original = new Uint8Array([0, 1, 0, 0, ...Array(64).fill(0).map((_, i) => i)]);
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("googleapis")
        ? new Response(
            `@font-face{src:url(https://fonts.gstatic.com/s/x.ttf) format('truetype')}`,
          )
        : new Response(original),
    ) as unknown as typeof fetch;

    const res = await GET(request("family=Archivo&weight=700"));
    const body = (await res.json()) as { base64: string };

    const decoded = Uint8Array.from(atob(body.base64), (c) => c.charCodeAt(0));
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it("reports a missing font file rather than throwing", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("/* nothing here */"),
    ) as unknown as typeof fetch;

    const res = await GET(request("family=Archivo&weight=700"));
    expect(res.status).toBe(502);
  });

  it("logs the network cause but does not return it", async () => {
    /*
     * A bare "fetch failed" is what made a TLS-interception problem look like a
     * bug in the route, so the cause chain has to be captured. It must not be
     * captured *in the response*: an earlier version returned it, which handed
     * any caller a description of this deployment's TLS path.
     */
    const error = new Error("fetch failed");
    error.cause = new Error("unable to verify the first certificate");
    globalThis.fetch = vi.fn(async () => {
      throw error;
    }) as unknown as typeof fetch;

    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(request("family=Archivo&weight=700"));
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(502);
    expect(body.error).toBe("Could not fetch the font.");
    expect(body.error).not.toContain("certificate");
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining("unable to verify the first certificate"),
    );
  });
});
