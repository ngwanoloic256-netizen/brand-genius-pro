import Link from "next/link";
import {
  ArrowRight,
  Copy,
  FileWarning,
  Globe,
  Layers,
  Palette,
  Repeat,
  Shield,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { BrandGeniusLogo } from "@/components/BrandGeniusLogo";
import { Reveal } from "@/components/Reveal";
import { SvgFrame } from "@/components/SvgFrame";
import { TryItLive } from "@/components/marketing/TryItLive";
import { type ShowcaseSlide } from "@/components/marketing/ShowcaseCarousel";
import { SurfaceScroller } from "@/components/marketing/SurfaceScroller";
import { PricingPlans } from "@/components/marketing/PricingPlans";
import { Ambience } from "@/components/marketing/Ambience";
import { ART_DIRECTIONS } from "@/lib/ai/art-direction";
import { PHOTO_SCENES } from "@/lib/ai/photo-scenes";
import { FLYER_FORMATS } from "@/lib/ai/flyer";
import { heroGuide, sampleGuides } from "@/lib/marketing-samples";
import type { MockupFamily } from "@/lib/types";

/** What each composition family is actually demonstrating. */
const FAMILY_BLURB: Record<MockupFamily, string> = {
  "flat-lay":
    "Shot from above, so the mark is judged flat and at true colour before anything is wrapped around a curve.",
  lifestyle:
    "The brand where someone would actually meet it, at the size and angle a passer-by gets rather than a designer.",
  "product-closeup":
    "Close enough to see the mark hold its shape at small size — the test most logos quietly fail.",
  "digital-screen":
    "On screen, where the palette has to clear contrast rules rather than merely look good on a moodboard.",
  signage:
    "Large format, where clear space and minimum size stop being guidance and start being structural.",
};

/**
 * BRAND GENIUS applied to its own collateral.
 *
 * The mark is the one the generator produced from this company's own brief, and
 * the surfaces were shot to the art direction that same run specified —
 * "documentary photography, desaturated", which is why they are all flat light
 * and cool neutrals rather than the usual glossy mockup lighting.
 */
const BRAND_SLIDES: ShowcaseSlide[] = [
  {
    id: "bg-cards",
    title: "Business cards",
    category: "Print",
    description:
      "The mark at its smallest working size, on uncoated stock. Nothing but the symbol — the wordmark is not needed once the shape carries.",
    image: "/brand/mockups/nb-cards.webp",
    alt: "BRAND GENIUS mark printed on a stack of business cards",
  },
  {
    id: "bg-tote",
    title: "Canvas tote",
    category: "Apparel",
    description:
      "The same geometry screen-printed at scale. A mark built from a circle and one rule survives the weave; a detailed one would not.",
    image: "/brand/mockups/gpt-tote.webp",
    alt: "BRAND GENIUS mark printed on a canvas tote bag",
  },
  {
    id: "bg-facade",
    title: "Building signage",
    category: "Environmental",
    description:
      "Fabricated as dimensional signage on cast concrete. At this size the mark stops being a logo and becomes architecture — which is the test a geometric symbol has to pass.",
    image: "/brand/mockups/env-facade.webp",
    alt: "BRAND GENIUS mark as dimensional signage on a concrete building facade",
  },
  {
    id: "bg-door",
    title: "Entrance glazing",
    category: "Environmental",
    description:
      "Frosted vinyl on a full-height glass door. The violet reads muted through the frosting, exactly as it would on the real thing.",
    image: "/brand/mockups/env-door.webp",
    alt: "BRAND GENIUS mark applied as frosted vinyl on a glass entrance door",
  },
  {
    id: "bg-box",
    title: "Packaging",
    category: "Packaging",
    description:
      "Single-colour print on unbleached board. The palette was derived in OKLCH, so the violet holds its identity from screen to uncoated card.",
    image: "/brand/mockups/gpt-box.webp",
    alt: "BRAND GENIUS mark printed on a plain cardboard box",
  },
];

export default function LandingPage() {
  const guides = sampleGuides();
  const hero = heroGuide();

  /*
   * The reel leads with BRAND GENIUS's own identity.
   *
   * These four are photographs of the mark this product generated for itself —
   * the direction it chose (Swiss minimal), the palette it derived, applied to
   * real surfaces. Showing the product's own output is a stronger claim than a
   * sample brand, and it is the one piece of evidence a visitor cannot dismiss
   * as cherry-picked: it is the company's actual logo.
   *
   * The generated vector mockups follow, so the reel covers both what the
   * compositor draws and what the surfaces look like.
   */
  /*
   * The vector half must not repeat a surface the photographic half already
   * showed. Taking the first three unfiltered put "Business cards" and a tote
   * in the reel twice, which reads as padding rather than range.
   */
  const covered = /card|tote|box|packag|sign|reception/i;
  const slides: ShowcaseSlide[] = [
    ...BRAND_SLIDES,
    ...hero.mockups
      .filter((mockup) => !covered.test(mockup.title))
      .slice(0, 3)
      .map((mockup) => ({
        id: mockup.id,
        title: mockup.title,
        category: mockup.category,
        description: FAMILY_BLURB[mockup.family],
        svg: mockup.svg,
      })),
  ];

  return (
    <div className="surface-night flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <Hero />
        <Showcase slides={slides} />
        <Features />
        <TryIt />
        <Problem />
        <Gallery guides={guides} />
        <Pricing />
        <Numbers />
        <FinalCta />
      </main>

      <SiteFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SiteHeader() {
  return (
    <header className="glass-night sticky top-0 z-40 border-x-0 border-t-0">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        <BrandGeniusLogo />

        <nav className="hidden items-center gap-7 text-[14px] font-medium text-white/60 md:flex">
          <a href="#showcase" className="transition-colors hover:text-white">
            Showcase
          </a>
          <a href="#features" className="transition-colors hover:text-white">
            Features
          </a>
          <a href="#gallery" className="transition-colors hover:text-white">
            Gallery
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden px-2 text-[14px] font-semibold text-white/60 transition-colors hover:text-white sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/projects/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-iris px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_-8px_rgb(79_70_229_/_0.8)] transition-colors hover:bg-iris-bright"
          >
            Start free
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-24 sm:px-8 lg:pb-28 lg:pt-36">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <span className="bloom left-[-15%] top-[-25%] size-[45%] bg-iris/25" />
        <span className="bloom bottom-[-25%] right-[-15%] size-[45%] bg-blush/12" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <Reveal>
          <span className="mb-7 inline-block rounded-full border border-iris-soft/25 bg-iris/20 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-iris-soft">
            Art direction first, then everything else
          </span>

          <h1 className="font-display text-[clamp(2.75rem,9vw,5.5rem)] font-extrabold leading-[0.92] tracking-[-0.045em]">
            BUILD YOUR
            <br />
            <span className="text-aurora">WHOLE IDENTITY</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-[17px] leading-relaxed text-white/60 sm:text-lg">
            One brief becomes a vector logo in five variants, a brand guide with
            print codes and usage rules, photoreal mockups, and print-ready
            flyers. Coherent, because every piece is derived from the same
            direction.
          </p>

          <div className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/projects/new"
              className="group inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-iris px-9 text-[13px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_24px_60px_-15px_rgb(79_70_229_/_0.85)] transition-colors hover:bg-iris-bright sm:w-auto"
            >
              Build a brand free
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
            <a
              href="#showcase"
              className="glass-night inline-flex h-14 w-full items-center justify-center rounded-2xl px-9 text-[13px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              See the output
            </a>
          </div>

          <p className="mt-6 text-[13px] text-white/50">
            No account needed to try it. No card, ever, on the free plan.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Showcase({ slides }: { slides: ShowcaseSlide[] }) {
  return (
    <section
      id="showcase"
      className="scroll-mt-20 border-y border-white/8 bg-white/[0.02]"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal>
          <div className="mb-14 max-w-2xl">
            <h2 className="font-display text-[clamp(2rem,5.5vw,3.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
              EVERY SURFACE,
              <br />
              <span className="font-serif italic text-white/50">
                one system.
              </span>
            </h2>
            {/*
              Two kinds of slide sit in this reel and the copy has to cover
              both, without counting them: an earlier version said "the first
              four", which was already wrong one commit later when a fifth
              photograph was added. Describing the methods instead of their
              tally means the sentence survives the reel changing.
            */}
            <p className="mt-6 text-[17px] leading-relaxed text-white/60">
              The photographs are our own identity — the mark this product
              generated for BRAND GENIUS, printed, fabricated and shot. The
              drawn ones are composited: a single vector mark, recoloured and
              placed on a measured spot. Same system, two ways of proving it.
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <SurfaceScroller slides={slides} />
        </Reveal>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Zap,
    tone: "text-amber-300",
    title: "One brief in",
    body: "A name, a sector, a few words on personality. The direction, palette, type and geometry all follow from it.",
  },
  {
    icon: Palette,
    tone: "text-blush",
    title: "Colour that holds up",
    body: "Ramps derived in OKLCH so the steps look evenly spaced, with every pairing contrast-checked before you see it.",
  },
  {
    icon: Layers,
    tone: "text-iris-soft",
    title: "Five logo variants",
    body: "Full colour, monochrome, inverted, icon-only and horizontal — drawn from one mark, so they stay a family.",
  },
  {
    icon: Globe,
    tone: "text-sky-300",
    title: "Mockups, not renders",
    body: "Photographed backplates with your vector lockup composited onto a measured placement, never a flat overlay.",
  },
  {
    icon: Shield,
    tone: "text-emerald-300",
    title: "Print-ready flyers",
    body: "A6 to A4 at true size, with 3mm bleed, a safe zone, and a layout drawn only from what the direction permits.",
  },
  {
    icon: Smartphone,
    tone: "text-lilac",
    title: "Everything exports",
    body: "SVG and transparent PNG for the marks, a full PDF for the guide. Yours to hand to a printer or a developer.",
  },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal>
          <div className="mb-16 text-center">
            <h2 className="font-display text-[clamp(2rem,5.5vw,3.5rem)] font-extrabold tracking-[-0.04em]">
              WHAT YOU GET
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-white/60">
              Not a logo and a colour swatch. The whole system, consistent
              because it is derived rather than assembled.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, tone, title, body }, i) => (
            <Reveal key={title} delay={i * 70}>
              <div className="glass-night group h-full rounded-3xl p-8 transition-all duration-200 hover:-translate-y-1.5 hover:border-white/20 sm:p-10">
                <span className="grid size-14 place-items-center rounded-2xl bg-white/8 transition-transform duration-200 group-hover:scale-110">
                  <Icon size={26} className={tone} />
                </span>
                <h3 className="mt-7 font-display text-xl font-extrabold tracking-[-0.02em]">
                  {title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/60">
                  {body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function TryIt() {
  const scenes = PHOTO_SCENES.filter((s) =>
    [
      "photo-business-cards",
      "photo-cup",
      "photo-storefront",
      "photo-tote",
    ].includes(s.id),
  );

  return (
    <section className="border-y border-white/8 bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-2xl font-display text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
              TYPE YOUR NAME.
              <br />
              <span className="font-serif italic text-white/50">
                Watch it land.
              </span>
            </h2>
            <p className="max-w-sm text-[15px] leading-relaxed text-white/60">
              This runs entirely in your browser — no account, no waiting. The
              mockup underneath is a real photograph, and the mark on it is
              vector at your exact colour.
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <TryItLive scenes={scenes} />
        </Reveal>
      </div>
    </section>
  );
}

const PROBLEMS = [
  {
    icon: Copy,
    title: "Logos that could belong to anyone",
    body: "Generated from the same handful of shapes as every other brand in the sector. Recognisable as AI output, not as you.",
  },
  {
    icon: FileWarning,
    title: "Guides nobody can follow",
    body: "A palette in a PNG, fonts named in a chat message, no clear space, no minimum size. Six months later nothing matches.",
  },
  {
    icon: Repeat,
    title: "Mockups that all look the same",
    body: "Eight business cards at eight angles. Nothing showing how the brand behaves on a shopfront, a screen, or a package.",
  },
];

function Problem() {
  return (
    <section className="relative overflow-hidden">
      <Ambience src="/ambience/press.webp" position="center 65%" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <h2 className="max-w-2xl font-display text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
            THREE WAYS IT
            <br />
            <span className="font-serif italic text-white/50">goes wrong.</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {PROBLEMS.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="glass-night h-full rounded-3xl p-8">
                <span className="grid size-11 place-items-center rounded-full bg-signal/20 text-signal">
                  <Icon size={19} />
                </span>
                <h3 className="mt-6 font-display text-lg font-bold tracking-[-0.015em]">
                  {title}
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-white/60">
                  {body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery({ guides }: { guides: ReturnType<typeof sampleGuides> }) {
  return (
    <section
      id="gallery"
      className="relative overflow-hidden scroll-mt-20 border-y border-white/8 bg-white/[0.02]"
    >
      <Ambience src="/ambience/packaging.webp" position="center 30%" opacity={0.45} />

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal>
          <div className="mb-14 max-w-2xl">
            <h2 className="font-display text-[clamp(2rem,5.5vw,3.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
              FOUR SECTORS,
              <br />
              <span className="font-serif italic text-white/50">
                four different answers.
              </span>
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed text-white/60">
              A roastery, a data platform, a clinic and a design studio — each
              with its own palette, type pairing and applications. The direction
              is chosen first, which is why they do not rhyme.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2">
          {guides.map((guide, i) => {
            const icon =
              guide.logo.find((v) => v.id === "icon") ?? guide.logo[0];

            return (
              <Reveal key={guide.brief.name} delay={i * 80}>
                <article className="glass-night h-full overflow-hidden rounded-3xl">
                  <div className="grid min-h-[200px] place-items-center bg-white/[0.03] p-8">
                    <SvgFrame
                      svg={icon.svg}
                      className="[&>svg]:h-20 [&>svg]:w-20"
                    />
                  </div>

                  <div className="p-7">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-xl font-extrabold tracking-[-0.02em]">
                        {guide.brief.name}
                      </h3>
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-iris-soft">
                        {guide.strategy.artDirection.name}
                      </span>
                    </div>

                    <p className="mt-3 text-[14px] leading-relaxed text-white/60">
                      {guide.strategy.voice.tagline}
                    </p>

                    <div className="mt-6 flex gap-1.5">
                      {guide.palette.slice(0, 6).map((swatch) => (
                        <span
                          key={swatch.hex + swatch.name}
                          className="h-8 flex-1 rounded-md ring-1 ring-white/10"
                          style={{ background: swatch.hex }}
                          title={`${swatch.name} ${swatch.hex}`}
                        />
                      ))}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal>
          <div className="text-center">
            <h2 className="font-display text-[clamp(2rem,5.5vw,3.5rem)] font-extrabold tracking-[-0.04em]">
              SIMPLE PRICING
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-white/60">
              Everything works before you pay. The free plan is the whole system
              with watermarked exports, not a locked demo.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <PricingPlans />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * The numbers band.
 *
 * Every figure is read from the module that implements it rather than typed
 * in, so this section cannot drift into claiming something the product does
 * not do. They are counts of what ships — not users, downloads or satisfaction
 * scores, which would be invented rather than measured.
 */
const NUMBERS = [
  { value: ART_DIRECTIONS.length, label: "Art directions" },
  { value: 5, label: "Logo variants" },
  { value: PHOTO_SCENES.length, label: "Mockup scenes" },
  { value: Object.keys(FLYER_FORMATS).length, label: "Flyer formats" },
];

function Numbers() {
  return (
    <section className="bg-iris">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-5 py-16 text-center sm:px-8 md:grid-cols-4 lg:py-20">
        {NUMBERS.map(({ value, label }) => (
          <div key={label}>
            <p className="font-display text-[clamp(2.5rem,7vw,4.25rem)] font-extrabold leading-none tracking-[-0.05em]">
              {value}
            </p>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <Ambience src="/ambience/storefront.webp" position="center 40%" opacity={0.6} />

      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <span className="bloom left-1/2 top-1/2 size-[55%] -translate-x-1/2 -translate-y-1/2 bg-iris/20" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 lg:py-32">
        <Reveal>
          <h2 className="font-display text-[clamp(2.5rem,8vw,5rem)] font-extrabold leading-[0.92] tracking-[-0.045em]">
            READY TO
            <br />
            <span className="font-serif italic text-white/50">
              look like you?
            </span>
          </h2>

          <p className="mx-auto mt-8 max-w-xl text-[17px] leading-relaxed text-white/60">
            Start with a name and a sector. You will have the full system on
            screen before you decide whether it is worth paying for.
          </p>

          <Link
            href="/projects/new"
            className="mt-11 inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-white px-10 text-[13px] font-bold uppercase tracking-[0.14em] text-night transition-transform hover:scale-[1.02]"
          >
            <Sparkles size={17} />
            Build a brand free
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
        <BrandGeniusLogo />

        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-[12px] font-bold uppercase tracking-[0.14em] text-white/50">
          <a href="#showcase" className="transition-colors hover:text-white">
            Showcase
          </a>
          <a href="#features" className="transition-colors hover:text-white">
            Features
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            Pricing
          </a>
          <Link href="/login" className="transition-colors hover:text-white">
            Sign in
          </Link>
        </nav>

        {/* 55%, not 40%: at 11px this is body text and owes 4.5:1. */}
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
          © {new Date().getFullYear()} Brand Genius
        </p>
      </div>
    </footer>
  );
}
