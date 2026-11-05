"use client";

import { useEffect, useState } from "react";

export const GUIDE_SECTIONS = [
  { id: "direction", label: "Direction artistique" },
  { id: "logo", label: "Logo et versions" },
  { id: "palette", label: "Palette de couleurs" },
  { id: "typography", label: "Typographie" },
  { id: "usage", label: "Utilisation du logo" },
  { id: "mockups", label: "Mockups" },
  { id: "social", label: "Réseaux sociaux" },
  { id: "flyers", label: "Flyers" },
  { id: "voice", label: "Ton et personnalité" },
] as const;

/** Sticky table of contents with scroll spy. */
export function GuideNav() {
  const [active, setActive] = useState<string>(GUIDE_SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: 0 },
    );

    for (const { id } of GUIDE_SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Sections de la charte"
      className="sticky top-8 hidden w-52 shrink-0 lg:block"
    >
      <p className="text-eyebrow mb-3">Sommaire</p>
      <ul className="space-y-0.5">
        {GUIDE_SECTIONS.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={active === id ? "true" : undefined}
              className={`flex items-center gap-2.5 rounded-lg py-1.5 pl-2.5 pr-2 text-[13px] transition-colors ${
                active === id
                  ? "bg-white font-semibold text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <span
                aria-hidden
                className={`h-4 w-0.5 rounded-full transition-colors ${
                  active === id ? "bg-ink" : "bg-line"
                }`}
              />
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function GuideSection({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-line pb-14 last:border-0">
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[clamp(1.375rem,2.5vw,1.75rem)] font-extrabold tracking-[-0.025em]">
            {title}
          </h2>
          {description && (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
