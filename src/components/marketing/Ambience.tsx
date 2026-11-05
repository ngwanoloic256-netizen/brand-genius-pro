import Image from "next/image";

/**
 * A photographic backdrop for a marketing section.
 *
 * The images are atmosphere, not evidence: unbranded paper stock, blank
 * packaging, an empty sign panel. That is deliberate on two counts. A landing
 * page for a branding product that showed invented logos would be claiming work
 * it never did — the real generated identities are already on this page, and
 * they are vector. And blank surfaces are the honest illustration of what the
 * product does to them.
 *
 * Every image sits under a scrim heavy enough that the section's own text
 * contrast is unchanged. The photograph is allowed to suggest depth; it is not
 * allowed to compete with a sentence.
 */
export function Ambience({
  src,
  alt,
  position = "center",
  opacity = 0.55,
}: {
  src: string;
  /** Empty by default: this is decoration, and a screen reader gains nothing. */
  alt?: string;
  /** object-position, to keep the interesting part of the frame in view. */
  position?: string;
  /**
   * How much of the photograph survives the scrim.
   *
   * Tuned by looking, not by taste: the first pass stacked a 0.22 image under a
   * 78% wash and a gradient on top of that, which multiplied out to roughly 5%
   * and rendered as flat black. The section read as if the image had failed to
   * load. These values keep the photograph legible while the contrast probe
   * still reports no text below its WCAG floor.
   */
  opacity?: number;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <Image
        src={src}
        alt={alt ?? ""}
        fill
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: position, opacity }}
        // Below the fold in every placement, so it must not block the load.
        loading="lazy"
        quality={70}
      />
      {/*
        One flat wash to set the floor, so no bright highlight in the photograph
        can lift the background under a line of text, and one vertical gradient
        that is opaque only at the edges — it welds the section to the page
        ground instead of leaving a seam where the image starts and stops, while
        leaving the middle band, where the photograph is actually visible, alone.
      */}
      <div className="absolute inset-0 bg-night/45" />
      <div className="absolute inset-0 bg-gradient-to-b from-night via-transparent to-night" />
    </div>
  );
}
