import { BrandGeniusLogo } from "@/components/BrandGeniusLogo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <BrandGeniusLogo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Editorial panel — the product's own identity, applied */}
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-bone lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 grain-overlay opacity-40" aria-hidden />

        <p className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-accent-soft">
          Brand systems, generated
        </p>

        <div className="relative">
          <p className="font-display text-[clamp(2rem,3.4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            A logo is not an identity.
          </p>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/55">
            A palette that holds up in print, type that survives a spreadsheet,
            rules someone can actually follow, and mockups that look like real
            products. That is the deliverable.
          </p>
        </div>

        <div className="relative flex gap-1.5" aria-hidden>
          {/* Reads the tokens rather than repeating them, so the strip cannot
              drift out of step with the palette the way it did once already. */}
          {[
            "var(--color-acid)",
            "var(--color-accent-soft)",
            "var(--color-bone)",
            "var(--color-ink-muted)",
            "var(--color-ink-soft)",
          ].map(
            (hex) => (
              <span
                key={hex}
                className="h-1.5 flex-1 rounded-full"
                style={{ background: hex }}
              />
            ),
          )}
        </div>
      </aside>
    </div>
  );
}
