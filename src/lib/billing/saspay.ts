import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Client SasPay (https://docs.saspay.me).
 *
 * Deux usages seulement :
 *   - créer une session de paiement hébergée (`POST /checkout-sessions/`) et
 *     envoyer le client sur sa page `checkout_url` ;
 *   - relire l'état d'une session (`GET /checkout-sessions/{id}/status/`) pour
 *     confirmer un paiement côté serveur. On ne croit jamais le navigateur :
 *     arriver sur la page de retour ne prouve rien, seul SasPay fait foi.
 *
 * La clé secrète (`sk_live_…` ou `sk_test_…`) reste côté serveur, dans
 * `SASPAY_SECRET_KEY`. Elle ne doit jamais être préfixée par `NEXT_PUBLIC_`.
 */

const API_BASE = "https://api.saspay.me/api/v1";

function cleaned(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function saspayKey(): string {
  return cleaned(process.env.SASPAY_SECRET_KEY);
}

export function isSaspayConfigured(): boolean {
  return /^sk_(live|test)_/.test(saspayKey());
}

/** Devise envoyée à SasPay. Le franc CFA d'Afrique centrale par défaut. */
export function saspayCurrency(): string {
  return cleaned(process.env.SASPAY_CURRENCY) || "XAF";
}

export class SaspayError extends Error {}

interface Envelope<T> {
  success?: boolean;
  data?: T;
  code?: string;
  message?: string;
  detail?: string;
  error?: string | { message?: string };
}

async function call<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  if (!isSaspayConfigured()) {
    throw new SaspayError("Le paiement SasPay n’est pas encore configuré.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${saspayKey()}`,
    Accept: "application/json",
  };
  if (init.body) headers["Content-Type"] = "application/json";
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new SaspayError("SasPay ne répond pas. Réessayez dans un instant.");
  }

  const json = (await res.json().catch(() => ({}))) as Envelope<T>;
  if (!res.ok || json.success === false || !json.data) {
    const reason =
      typeof json.error === "string"
        ? json.error
        : json.error?.message ?? json.message ?? json.detail ?? json.code;
    console.error("SasPay a refusé la requête", res.status, path, reason);
    throw new SaspayError(
      "Le paiement n’a pas pu être préparé. Réessayez ou contactez-nous.",
    );
  }
  return json.data;
}

export interface CheckoutSession {
  id: string;
  slug?: string;
  checkout_url: string;
  status?: string;
}

export async function createCheckoutSession(input: {
  amount: number;
  description: string;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
  idempotencyKey: string;
}): Promise<CheckoutSession> {
  const session = await call<CheckoutSession>("/checkout-sessions/", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: JSON.stringify({
      amount: input.amount.toFixed(2),
      currency: saspayCurrency(),
      description: input.description,
      customer_email: input.customerEmail,
      customer_name: input.customerName,
      return_url: input.returnUrl,
    }),
  });

  if (!session.id || !session.checkout_url) {
    throw new SaspayError("SasPay n’a pas renvoyé de page de paiement.");
  }
  return session;
}

export type PaymentState = "paid" | "failed" | "pending";

const PAID = /^(success|successful|succeeded|paid|completed|complete)$/i;
const FAILED = /^(failed|cancelled|canceled|expired|rejected|declined)$/i;

/** Ramène les différents statuts possibles à trois états. */
export function paymentStateFrom(status: unknown): PaymentState {
  const value = typeof status === "string" ? status.trim() : "";
  if (PAID.test(value)) return "paid";
  if (FAILED.test(value)) return "failed";
  return "pending";
}

/**
 * Statut d'une session. La réponse exacte n'est pas entièrement documentée,
 * donc on lit le premier champ de statut trouvé, au premier niveau ou dans un
 * objet `payment` / `transaction` imbriqué.
 */
export async function getCheckoutState(sessionId: string): Promise<{
  state: PaymentState;
  raw: Record<string, unknown>;
}> {
  const data = await call<Record<string, unknown>>(
    `/checkout-sessions/${encodeURIComponent(sessionId)}/status/`,
  );

  const nested = [data, data.payment, data.transaction].filter(
    (v): v is Record<string, unknown> => typeof v === "object" && v !== null,
  );
  const states = nested.map((o) => paymentStateFrom(o.status));
  const state = states.includes("paid")
    ? "paid"
    : states.includes("failed")
      ? "failed"
      : "pending";

  return { state, raw: data };
}

/* -------------------------------------------------------------------------- */
/*  Webhooks                                                                  */
/* -------------------------------------------------------------------------- */

/** Écart toléré entre l'horodatage du webhook et l'heure du serveur. */
export const WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * Vérifie la signature d'un webhook SasPay.
 *
 * SasPay signe `timestamp + "." + corps brut` en HMAC SHA-256 (hexadécimal
 * minuscule) avec le secret du webhook. La comparaison se fait à temps
 * constant, sur le corps brut reçu, jamais sur un JSON re-sérialisé.
 */
export function verifyWebhookSignature(input: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  secret: string;
  now?: number;
}): boolean {
  const { rawBody, signature, timestamp, secret } = input;
  if (!secret || !signature || !timestamp) return false;
  if (!/^\d+$/.test(timestamp) || !/^[0-9a-f]+$/i.test(signature)) return false;

  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature.toLowerCase(), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
