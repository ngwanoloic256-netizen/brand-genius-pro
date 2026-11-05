import { describe, expect, it } from "vitest";
import { sanitizeMarkup } from "@/lib/ai/logo";

/**
 * The sanitiser is the only thing standing between untrusted SVG — model
 * output and user uploads alike — and `dangerouslySetInnerHTML`. Each case
 * here is a vector that must not survive.
 */
describe("sanitizeMarkup", () => {
  const mustNotContain = (input: string, needle: string) => {
    expect(sanitizeMarkup(input).toLowerCase()).not.toContain(needle);
  };

  it("removes script elements together with their contents", () => {
    const output = sanitizeMarkup('<circle r="5"/><script>alert(1)</script>');
    expect(output.toLowerCase()).not.toContain("<script");
    // Dropping only the tags would leave the body behind as a text node.
    expect(output).not.toContain("alert(1)");
    expect(output).toContain('<circle r="5"/>');
  });

  it("removes style elements together with their contents", () => {
    const output = sanitizeMarkup(
      '<style>*{background:url("javascript:alert(1)")}</style><rect/>',
    );
    expect(output.toLowerCase()).not.toContain("<style");
    expect(output).not.toContain("javascript:");
  });

  it("removes quoted event handlers", () => {
    mustNotContain('<circle r="5" onload="alert(1)"/>', "onload");
  });

  it("removes unquoted event handlers", () => {
    mustNotContain("<circle r=5 onload=alert(1) />", "onload");
  });

  it("removes single-quoted event handlers", () => {
    mustNotContain("<rect onclick='steal()'/>", "onclick");
  });

  it("removes animation elements that can rewrite attributes", () => {
    const input =
      '<rect id="a"/><animate attributeName="href" to="javascript:alert(1)"/>';
    const output = sanitizeMarkup(input).toLowerCase();
    expect(output).not.toContain("<animate");
    expect(output).not.toContain("javascript:");
  });

  it("removes <set> elements", () => {
    mustNotContain('<set attributeName="onload" to="alert(1)"/>', "<set");
  });

  it("strips external href targets but keeps fragment references", () => {
    expect(sanitizeMarkup('<path href="https://evil.test/x"/>')).not.toContain(
      "evil.test",
    );
    expect(sanitizeMarkup('<path href="#gradient"/>')).toContain("#gradient");
  });

  it("strips xlink:href pointing off-document", () => {
    mustNotContain('<use xlink:href="https://evil.test/x"/>', "evil.test");
  });

  it("removes javascript: payloads hidden in arbitrary attributes", () => {
    mustNotContain('<path fill="url(javascript:alert(1))"/>', "javascript:");
  });

  it("removes foreignObject and everything it hosts", () => {
    const output = sanitizeMarkup(
      "<foreignObject><body onload=alert(1)>hostile</body></foreignObject><rect/>",
    );
    expect(output.toLowerCase()).not.toContain("<foreignobject");
    expect(output).not.toContain("hostile");
    expect(output).toContain("<rect/>");
  });

  it("removes <image>, which can load remote content", () => {
    mustNotContain('<image href="https://evil.test/pixel.png"/>', "<image");
  });

  it("keeps legitimate drawing elements untouched", () => {
    const safe =
      '<path d="M10 10 H 90 V 90 H 10 Z" fill="{{MARK}}"/><circle cx="50" cy="50" r="20" fill="{{ACCENT}}"/>';
    expect(sanitizeMarkup(safe)).toBe(safe);
  });

  it("preserves the colour placeholders the lockup composer relies on", () => {
    const output = sanitizeMarkup('<rect fill="{{MARK}}" stroke="{{ACCENT}}"/>');
    expect(output).toContain("{{MARK}}");
    expect(output).toContain("{{ACCENT}}");
  });
});
