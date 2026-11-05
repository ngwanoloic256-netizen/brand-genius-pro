import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * The config was empty, so the app shipped with none of these. They are cheap
 * and they close real classes of attack, but the CSP in particular has to be
 * written against what this app actually does rather than copied from a
 * template — a policy that breaks the page is worse than none, because the fix
 * is usually to delete it.
 *
 * What constrains the policy here:
 *
 *   - `style-src` needs 'unsafe-inline'. next/font injects a <style> block for
 *     the font-face declarations and React sets inline styles throughout the
 *     guide (swatches, type specimens, placement transforms). There is no nonce
 *     path for those today, so this is honest compatibility debt rather than a
 *     considered choice.
 *   - `script-src` needs 'unsafe-inline' in development only: the dev overlay
 *     and HMR client rely on it. Production keeps it out.
 *   - `img-src` needs data: and blob:. Mockups rasterise through a canvas and
 *     the PDF/ZIP exports hand the browser blob: URLs.
 *   - `font-src` allows fonts.gstatic.com because the guide loads the brand's
 *     own families from Google Fonts.
 *   - `connect-src` allows Supabase over https and wss for realtime.
 */
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self'${isDev ? " 'unsafe-inline' 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Defence in depth: frame-ancestors already covers modern browsers.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
