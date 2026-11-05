/**
 * Colour placeholders used inside a generated mark, and the substitution that
 * resolves them.
 *
 * This lives apart from `logo.ts` on purpose. `logo.ts` reaches the Anthropic
 * SDK through its client module, so anything importing it drags that SDK along
 * — fine on the server, unacceptable in a browser bundle. The landing page's
 * live preview recolours marks client-side, and it needs exactly these three
 * exports and nothing else.
 */

export const MARK_TOKEN = "{{MARK}}";
export const ACCENT_TOKEN = "{{ACCENT}}";

/** Replaces the two placeholders with concrete colours. */
export function paintMark(
  markup: string,
  markColor: string,
  accentColor: string,
): string {
  return markup
    .split(MARK_TOKEN)
    .join(markColor)
    .split(ACCENT_TOKEN)
    .join(accentColor);
}
