import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-line px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-10">
      <div className="min-w-0">
        {eyebrow && <p className="text-eyebrow mb-2.5">{eyebrow}</p>}
        <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2.5">{actions}</div>}
    </header>
  );
}
