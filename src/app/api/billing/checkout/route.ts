import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import {
  SaspayError,
  createCheckoutSession,
  isSaspayConfigured,
  saspayCurrency,
} from "@/lib/billing/saspay";
import { CYCLE_LABEL, planById, priceFor } from "@/lib/billing/plans";
import { absoluteUrl } from "@/lib/site-url";
import { slidingWindow } from "@/lib/rate-limit-window";

const Body = z.object({
  plan: z.enum(["pro", "studio"]),
  cycle: z.enum(["monthly", "annual"]),
});

/**
 * Crée une session de paiement SasPay et renvoie l'URL où envoyer le client.
 *
 * Le montant vient de `PLANS` côté serveur, jamais du navigateur : le client
 * choisit seulement l'offre et la durée.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isAdminConfigured() || !isSaspayConfigured()) {
    return NextResponse.json(
      { error: "Le paiement en ligne n’est pas encore activé sur ce site." },
      { status: 503 },
    );
  }

  const user = await getUser();
  if (!user?.email) {
    return NextResponse.json(
      { error: "Connectez-vous pour vous abonner." },
      { status: 401 },
    );
  }

  const burst = slidingWindow(`checkout:${user.id}`, 6, 10 * 60 * 1000);
  if (!burst.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Offre inconnue." }, { status: 400 });
  }

  const plan = planById(parsed.data.plan);
  const { cycle } = parsed.data;
  const amount = priceFor(plan, cycle);
  const admin = createAdminClient();

  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      plan: plan.id,
      cycle,
      amount,
      currency: saspayCurrency(),
    })
    .select("id")
    .single();

  if (error || !payment) {
    console.error("Impossible d’enregistrer le paiement :", error);
    return NextResponse.json(
      { error: "Le paiement n’a pas pu être préparé." },
      { status: 500 },
    );
  }

  try {
    const session = await createCheckoutSession({
      amount,
      description: `BRAND GENIUS ${plan.name} · ${CYCLE_LABEL[cycle]}`,
      customerEmail: user.email,
      customerName:
        (user.user_metadata?.full_name as string | undefined) ??
        user.email.split("@")[0],
      returnUrl: absoluteUrl(`/abonnement/retour?ref=${payment.id}`),
      idempotencyKey: payment.id,
    });

    await admin
      .from("payments")
      .update({ provider_session_id: session.id })
      .eq("id", payment.id);

    return NextResponse.json({ url: session.checkout_url });
  } catch (err) {
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    const message =
      err instanceof SaspayError ? err.message : "Le paiement n’a pas pu être préparé.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
