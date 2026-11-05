import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ink text-bone hover:bg-ink-soft border border-ink shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]",
  secondary:
    "bg-white text-ink border border-line hover:border-ink hover:bg-bone-deep",
  ghost:
    "bg-transparent text-ink-muted border border-transparent hover:text-ink hover:bg-bone-deep",
  danger:
    "bg-white text-signal-deep border border-line hover:border-signal hover:bg-signal/5",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2.5",
};

function classes(variant: Variant, size: Size, className?: string): string {
  return [
    "inline-flex items-center justify-center rounded-full font-semibold",
    "transition-[background-color,border-color,color,transform] duration-150",
    "active:translate-y-px disabled:opacity-45 disabled:pointer-events-none",
    "whitespace-nowrap",
    VARIANTS[variant],
    SIZES[size],
    className ?? "",
  ].join(" ");
}

interface BaseProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: BaseProps & ComponentProps<"button">) {
  return (
    <button className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: BaseProps & ComponentProps<typeof Link>) {
  return (
    <Link className={classes(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
