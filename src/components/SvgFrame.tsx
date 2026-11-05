/**
 * Renders generated SVG markup.
 *
 * This is the single place in the app where generated markup reaches the DOM.
 * Everything that arrives here has already been through `sanitizeMarkup()` in
 * `lib/ai/logo.ts`, which strips script, style, foreignObject, event handlers,
 * and external references — model output and uploaded logos alike. Keeping the
 * injection in one component means that boundary has exactly one place to be
 * audited, and nothing else in the app calls `dangerouslySetInnerHTML`.
 */

interface SvgFrameProps {
  svg: string;
  className?: string;
  /** Accessible description; the inner <svg> already carries aria-label. */
  title?: string;
}

export function SvgFrame({ svg, className, title }: SvgFrameProps) {
  return (
    <div
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
