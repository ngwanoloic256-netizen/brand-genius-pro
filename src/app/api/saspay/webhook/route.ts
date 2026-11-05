import { NextResponse } from "next/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/billing/saspay";
import { confirmPayment } from "@/lib/billing/subscription";

/**
 * Webhook SasPay.
 *
 * À déclarer dans le tableau de bord SasPay (Webhooks) avec l'URL
 * `https://<votre-site>/api/saspay/webhook` et l'événement
 * `transaction.success`. Le secret de signature affiché à la création va dans
 * `SASPAY_WEBHOOK_SECRET`.
 *
 * Le webhook ne fait pas confiance à son propre contenu pour activer une
 * offre : il retrouve le paiement en attente, puis redemande son statut à
 * SasPay avec la clé secrète. Un faux webhook bien signé ne suffirait donc pas.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.SASPAY_WEBHOOK_SECRET?.trim() ?? "";

  const valid = verifyWebhookSignature({
    rawBody,
    signature: request.headers.get("x-webhook-signature"),
    timestamp: request.headers.get("x-webhook-timestamp"),
    secret,
  });
  if (!valid) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  let payload: { event?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  const admin = createAdminClient();
  const event = payload.event ?? request.headers.get("x-webhook-event") ?? "inconnu";

  const { data: logged } = await admin
    .from("billing_events")
    .insert({ event, payload })
    .select("id")
    .single();

  // Seuls les paiements réussis nous intéressent ; le reste est journalisé.
  if (event !== "transaction.success" && event !== "transaction.failed") {
    return NextResponse.json({ received: true });
  }

  /*
   * L'événement porte l'identifiant de la transaction et sa référence, pas
   * toujours celui de la session. On essaie donc chaque identifiant connu
   * contre `provider_session_id`. Si rien ne correspond, l'activation se fera
   * quand le client reviendra sur la page de retour.
   */
  const data = payload.data ?? {};
  const candidates = [data.checkout_session_id, data.session_id, data.id, data.reference]
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  let handled = false;
  if (candidates.length > 0) {
    const { data: payments } = await admin
      .from("payments")
      .select("id")
      .in("provider_session_id", candidates)
      .eq("status", "pending");

    for (const payment of payments ?? []) {
      try {
        const result = await confirmPayment(payment.id);
        handled ||= result.status === "paid" || result.status === "failed";
      } catch (err) {
        console.error("Webhook SasPay : confirmation impossible", err);
      }
    }
  }

  if (logged?.id && handled) {
    await admin.from("billing_events").update({ handled: true }).eq("id", logged.id);
  }

  // Toujours 200 une fois la signature vérifiée : SasPay ne doit pas renvoyer
  // en boucle un événement que nous avons bien reçu.
  return NextResponse.json({ received: true, handled });
}
