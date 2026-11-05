import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { paymentStateFrom, verifyWebhookSignature } = await import("@/lib/billing/saspay");
const { PLANS, BEST_SAVING, annualPerMonth, formatFcfa, priceFor, planById } = await import(
  "@/lib/billing/plans"
);

const SECRET = "whsec_test";
const sign = (ts: string, body: string) =>
  createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");

describe("signature des webhooks SasPay", () => {
  const body = JSON.stringify({ event: "transaction.success", data: { id: "abc" } });
  const now = 1_800_000_000;
  const ts = String(now);

  it("accepte une signature valide", () => {
    expect(verifyWebhookSignature({ rawBody: body, signature: sign(ts, body), timestamp: ts, secret: SECRET, now })).toBe(true);
  });

  it("refuse un corps modifié", () => {
    expect(verifyWebhookSignature({ rawBody: body + " ", signature: sign(ts, body), timestamp: ts, secret: SECRET, now })).toBe(false);
  });

  it("refuse un horodatage trop ancien (rejeu)", () => {
    expect(verifyWebhookSignature({ rawBody: body, signature: sign(ts, body), timestamp: ts, secret: SECRET, now: now + 301 })).toBe(false);
  });

  it("refuse sans secret ni en-têtes", () => {
    expect(verifyWebhookSignature({ rawBody: body, signature: null, timestamp: ts, secret: SECRET, now })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: body, signature: sign(ts, body), timestamp: ts, secret: "", now })).toBe(false);
  });
});

describe("statuts de paiement", () => {
  it("ramène les statuts à trois états", () => {
    expect(paymentStateFrom("SUCCESS")).toBe("paid");
    expect(paymentStateFrom("completed")).toBe("paid");
    expect(paymentStateFrom("FAILED")).toBe("failed");
    expect(paymentStateFrom("CANCELLED")).toBe("failed");
    expect(paymentStateFrom("PENDING")).toBe("pending");
    expect(paymentStateFrom(undefined)).toBe("pending");
  });
});

describe("offres", () => {
  it("l'annuel coûte moins que douze mois", () => {
    for (const plan of PLANS.filter((p) => p.monthly > 0)) {
      expect(plan.annual).toBeLessThan(plan.monthly * 12);
      expect(annualPerMonth(plan)).toBeLessThan(plan.monthly);
    }
    expect(BEST_SAVING).toBeGreaterThan(0);
  });

  it("formate les FCFA à la française", () => {
    expect(formatFcfa(99000)).toBe("99 000");
    expect(formatFcfa(9900)).toBe("9 900");
  });

  it("une offre inconnue retombe sur le gratuit", () => {
    expect(planById("hacker").id).toBe("free");
    expect(priceFor(planById("pro"), "annual")).toBe(99_000);
  });
});
