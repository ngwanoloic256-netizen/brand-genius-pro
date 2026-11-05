# BRAND GENIUS

> 🇫🇷 Guide d'installation pas à pas en français : **[MODE-D-EMPLOI.md](MODE-D-EMPLOI.md)**

Generates a complete brand identity from a single brief: a vector logo system,
a professional brand guide, and contextual mockups that never repeat.

- **Logo** — one mark, composed into five variants (full colour, monochrome,
  inverted, icon-only, horizontal), exportable as SVG and transparent PNG.
- **Guide** — palette with HEX/RGB/CMYK and contrast-checked foregrounds, a
  four-role type system, clear-space and minimum-size rules, do's and don'ts,
  and a tone-of-voice section. Exports to PDF.
- **Mockups** — photographed backplates with the vector lockup composited onto
  a measured placement quad, across five composition families, with no two
  consecutive mockups sharing a camera angle or support type.
- **Flyers** — print-ready in A6/A5/DL/A4 at true size, with 3mm bleed, a safe
  zone, an enforced 3:1 hierarchy ratio, and a layout drawn only from the set
  the brand's art direction permits.

## Running it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. **No configuration is required to try it** — the
app ships a local mode where projects live in memory and identities are
generated deterministically, so the dashboard, wizard, guide, mockups, and
exports all work before any credentials exist.

```bash
npm test        # vitest — sanitiser, variety rule, palette invariants
npm run typecheck
npm run build
```

## Configuration

Copy `.env.example` to `.env.local` and fill in what you need. Each service is
independent — configure either, both, or neither.

| Variable | Enables |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Accounts, persistence, asset storage |
| `ANTHROPIC_API_KEY` | Model-generated strategy, palette, typography, and logo marks |
| `NEXT_PUBLIC_SITE_URL` | Auth email redirects and OpenGraph metadata |

### Supabase

Run `supabase/migrations/0001_init.sql` against the project (SQL editor, or
`supabase db push`). It creates the schema, the `brand-assets` storage bucket,
and the row-level security policies. **RLS is the security boundary** — the
anon key is public by design, and every table denies access that is not the
owner's.

Without these variables the app runs in local mode: no accounts, no
persistence, and the in-memory store resets when the server restarts.

### Anthropic

Without `ANTHROPIC_API_KEY` the pipeline falls back to a deterministic
generator that derives a coherent palette, type pairing, and geometric monogram
from the brief. Everything downstream — variants, mockups, PDF — works
identically; only the creative decisions differ.

## How the pipeline works

```
brand brief (or imported logo)
  → direction  one of ten complete token sets            lib/ai/art-direction.ts
  → strategy   sector, voice, palette, typography        lib/ai/strategy.ts
  → logo       one vector mark → five variants           lib/ai/logo.ts
  → mockups    contextual scenes, variety-enforced       lib/ai/mockups.ts
  → flyers     print-ready, layout filtered by direction lib/ai/flyer.ts
  → quality    blocking gates, repairs what it can       lib/ai/quality.ts
  → guide      the object the page and PDF both read     lib/ai/pipeline.ts
```

**Art direction is chosen first, and everything else derives from it.** Without
that inversion the generator produces one house style with the hue swapped —
which is what it did before. A profile fixes geometry, type *classes*, colour
harmony and the photographic treatment of the mockups, so a coffee roastery and
a SaaS platform come out genuinely unalike rather than differently tinted.

Selection is deterministic and implements the anti-generic rule: a brief that
states no personality does **not** average toward a safe profile, it commits to
an opinionated one. Averaging is what produces blandness.

Colour is derived in OKLCH. Equal steps in HSL lightness do not look equal — mid
tones bunch and the light end goes chalky — and out-of-gamut colours lose chroma
rather than being channel-clipped, which would drift the hue.

Quality gates run before hand-off. They repair what is repairable, and only ever
by moving a neutral: the accent carries brand meaning, and a system that
silently re-hues it to satisfy a contrast checker is no longer the system the
designer chose.

Each stage is independently callable, which is what makes "regenerate this
section" cheap: changing the palette recolours the lockups and re-renders the
scenes without redrawing the mark.

**The model decides, the code derives.** It returns semantic choices only —
colour names and hex values, font families, tone rules, and the mark's vector
geometry. Print codes, contrast-safe foregrounds, font stacks, Google Fonts
URLs, and all five logo lockups are computed locally. That split is why the
guide is always internally consistent, and why the variants look like one
system rather than five unrelated drawings.

**Mockups are drawn, not sampled.** Scenes are SVG templates that know their
composition family, so the variety rule is enforced rather than hoped for:
`selectScenes()` guarantees no template repeats and no two consecutive scenes
share a family. Sector detection reorders the candidates — a café leads with a
cup and a storefront, a SaaS with an app screen and a website.

## Security notes

- **Generated and uploaded SVG** passes through `sanitizeMarkup()` before it
  reaches the DOM, and `components/SvgFrame.tsx` is the only component in the
  app that injects HTML. `tests/sanitize.test.ts` covers scripts, quoted and
  unquoted event handlers, animation elements, external `href`s, and
  `javascript:` payloads.
- **Generation endpoints call a paid API**, so all three are rate limited in
  two layers: an in-process sliding window for bursts, and the
  `generation_events` ledger in Postgres as the durable per-account quota.
  The ledger doubles as the audit trail.
- **Authorization is RLS**, not application code. `src/proxy.ts` redirects
  signed-out users away from the app shell, but that is a UX guard — every
  read and write is independently scoped in the database.
- **Server Actions re-check ownership.** A Server Action is a public HTTP
  endpoint, so the project id in a form body is never trusted on its own.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase, the Anthropic
SDK, jsPDF + svg2pdf for client-side PDF export, and Vitest.

Note that `proxy.ts` is this Next version's replacement for `middleware.ts`,
and `params`, `searchParams`, `cookies()`, and `headers()` are all async.

## Deploying

Push to a Git host and import the project on Vercel, then set the environment
variables above in the project settings. Set `NEXT_PUBLIC_SITE_URL` to the
deployed origin, and add `<origin>/auth/callback` to Supabase's allowed
redirect URLs.
