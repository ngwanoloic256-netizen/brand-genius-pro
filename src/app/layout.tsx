import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Manrope,
  JetBrains_Mono,
  Newsreader,
} from "next/font/google";
import { siteUrlObject } from "@/lib/site-url";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display-loaded",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  display: "swap",
});

const sans = Manrope({
  variable: "--font-sans-loaded",
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-loaded",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

/*
 * Italic only, and only for the second half of a display heading — the pairing
 * the landing leans on is a tight grotesque against one italic serif word.
 * Loading the roman would tempt its use for body copy, which is not the job.
 */
const serif = Newsreader({
  variable: "--font-serif-loaded",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BRAND GENIUS — Votre identité de marque complète en quelques minutes",
    template: "%s · BRAND GENIUS",
  },
  description:
    "Créez un logo, une charte graphique professionnelle, des mockups réalistes et un kit réseaux sociaux à partir d’un seul brief, ou de votre logo existant.",
  metadataBase: siteUrlObject(),
  openGraph: {
    title: "BRAND GENIUS",
    description:
      "Une identité de marque complète (logo, charte, mockups, réseaux sociaux) créée à partir d’un seul brief.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${display.variable} ${sans.variable} ${mono.variable} ${serif.variable} h-full`}
      style={
        {
          "--font-display": `var(--font-display-loaded), "Segoe UI", system-ui, sans-serif`,
          "--font-sans": `var(--font-sans-loaded), "Segoe UI", system-ui, sans-serif`,
          "--font-mono": `var(--font-mono-loaded), ui-monospace, monospace`,
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
