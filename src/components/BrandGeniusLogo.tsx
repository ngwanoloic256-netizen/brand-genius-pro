import Link from "next/link";

/**
 * BRAND GENIUS's own mark — an aperture built from four rotated blades, read as
 * a lens focusing on a single point. Drawn inline so it inherits currentColor
 * and stays crisp at every size.
 */
export function BrandGeniusMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="1.25"
        y="1.25"
        width="29.5"
        height="29.5"
        rx="9"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M16 7.5 L24.5 16 L16 24.5 L7.5 16 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="3.1" fill="currentColor" />
    </svg>
  );
}

export function BrandGeniusLogo({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 ${className ?? ""}`}
      aria-label="Accueil BRAND GENIUS"
    >
      <BrandGeniusMark size={compact ? 24 : 28} />
      {!compact && (
        <span className="font-display text-[15px] font-extrabold tracking-[0.18em] leading-none">
          BRAND
          {/* 55%, not 45%: on the night surface the lower value lands at
              4.2:1, and this is 15px text, which needs 4.5. */}
          <span className="opacity-55"> GENIUS</span>
        </span>
      )}
    </Link>
  );
}
