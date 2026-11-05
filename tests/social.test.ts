import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SOCIAL_FORMATS, fitText, generateSocialKit } from "@/lib/ai/social";
import { advanceWidth } from "@/lib/ai/text-metrics";
import { ART_DIRECTIONS } from "@/lib/ai/art-direction";
import { buildDemoGuide } from "@/lib/demo-store";

const BRIEFS = [
  { name: "Saveurs de Douala", industry: "Pâtisserie artisanale", keywords: "fait maison, gourmand, généreux" },
  { name: "Kribi Tech Solutions", industry: "Logiciel SaaS", keywords: "clarté, rigueur, données" },
  { name: "Clinique Espoir", industry: "Clinique dentaire", keywords: "calme, précision, soins" },
];

describe("kit réseaux sociaux", () => {
  it("produit un visuel par format, aux dimensions de la plateforme", () => {
    const guide = buildDemoGuide(BRIEFS[0]);
    const kit = generateSocialKit(guide);
    expect(kit).toHaveLength(SOCIAL_FORMATS.length);
    for (const asset of kit) {
      expect(asset.svg).toContain(`viewBox="0 0 ${asset.format.width} ${asset.format.height}"`);
      expect(asset.svg).not.toContain("{{MARK}}");
      expect(asset.svg).not.toContain("NaN");
      expect(asset.svg).not.toContain("undefined");
    }
  });

  it("n'ajoute le filigrane que pour l'offre gratuite", () => {
    const guide = buildDemoGuide(BRIEFS[1]);
    expect(generateSocialKit(guide, { watermark: true })[1].svg).toContain("version gratuite");
    expect(generateSocialKit(guide, { watermark: false })[1].svg).not.toContain("version gratuite");
  });

  it("reprend le texte saisi et le numéro WhatsApp dans la story", () => {
    const guide = buildDemoGuide(BRIEFS[2]);
    const story = generateSocialKit(guide, {
      content: { headline: "Votre sourire, notre priorité", phone: "+237 6 90 00 00 00" },
    }).find((a) => a.format.id === "story")!;
    expect(story.svg).toContain("+237 6 90 00 00 00");
    expect(story.svg).toMatch(/sourire|SOURIRE/);
  });

  it("fait tenir un long texte dans la largeur donnée", () => {
    const font = `"Inter", sans-serif`;
    const fit = fitText(
      "Des gâteaux faits maison avec des ingrédients du marché, livrés partout à Douala",
      font,
      800,
      140,
      40,
      4,
    );
    expect(fit.lines.length).toBeLessThanOrEqual(4);
    for (const line of fit.lines) {
      expect(advanceWidth(line, fit.size, 0, font)).toBeLessThanOrEqual(800 + 1);
    }
  });

  it("fonctionne avec toutes les directions artistiques", () => {
    for (const direction of ART_DIRECTIONS) {
      const guide = buildDemoGuide(BRIEFS[0]);
      guide.strategy.artDirection = direction;
      expect(() => generateSocialKit(guide)).not.toThrow();
    }
  });

  // Aperçu visuel pour contrôle manuel : SOCIAL_PREVIEW=/chemin/fichier.html
  it.runIf(Boolean(process.env.SOCIAL_PREVIEW))("écrit un aperçu", () => {
    let html = `<html><body style="margin:0;padding:16px;background:#ddd;font-family:sans-serif">`;
    BRIEFS.forEach((brief, i) => {
      const g = buildDemoGuide(brief);
      const kit = generateSocialKit(g, { watermark: i === 1, content: { phone: "+237 6 90 12 34 56" } });
      html += `<h3>${g.brief.name} — ${g.strategy.artDirection.name}</h3><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start">`;
      for (const a of kit) {
        const w = a.format.width > 1600 ? 560 : a.format.height > a.format.width ? 170 : 300;
        html += `<div style="width:${w}px">${a.svg.replace(/width="\d+" height="\d+"/, 'width="100%"')}</div>`;
      }
      html += `</div>`;
    });
    writeFileSync(process.env.SOCIAL_PREVIEW!, `${html}</body></html>`);
  });
});
