import "server-only";
import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/config";
import { createAdminClient } from "../supabase/admin";
import { getCheckoutState } from "./saspay";
import { planById, type Plan, type PlanId } from "./plans";

export interface Subscription {
  plan: Plan;
  /** Fin de la période payée, ou null pour l'offre gratuite. */
  periodEnd: string | null;
}

/**
 * L'offre en cours de l'utilisateur connecté.
 *
 * Sans base de données (mode local de développement), tout est débloqué : il
 * n'y a ni compte ni paiement possible, et un filigrane ne ferait que gêner
 * les tests.
 */
export async function currentSubscription(): Promise<Subscription> {
  if (!isSupabaseConfigured()) return { plan: planById("studio"), periodEnd: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { plan: planById("free"), periodEnd: null };

  const { data } = await supabase
    .from("subscriptions")
    .select("plan, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data || new Date(data.current_period_end).getTime() <= Date.now()) {
    return { plan: planById("free"), periodEnd: data?.current_period_end ?? null };
  }
  return { plan: planById(data.plan as PlanId), periodEnd: data.current_period_end };
}

export type ConfirmResult =
  | { status: "paid"; periodEnd: string | null }
  | { status: "pending" }
  | { status: "failed" }
  | { status: "unknown" };

/**
 * Confirme un paiement auprès de SasPay puis active l'offre.
 *
 * Appelé par la page de retour et par le webhook. Les deux peuvent tourner en
 * même temps sans risque : `activate_payment` ne passe une ligne en payé
 * qu'une seule fois.
 */
export async function confirmPayment(paymentId: string): Promise<ConfirmResult> {
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, status, provider_session_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) return { status: "unknown" };
  if (payment.status === "paid") return { status: "paid", periodEnd: null };
  if (!payment.provider_session_id) return { status: "pending" };

  const { state } = await getCheckoutState(payment.provider_session_id);

  if (state === "failed") {
    await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("id", paymentId)
      .eq("status", "pending");
    return { status: "failed" };
  }
  if (state !== "paid") return { status: "pending" };

  const { data: periodEnd, error } = await admin.rpc("activate_payment", {
    payment: paymentId,
  });
  if (error) throw new Error(`Activation de l’offre impossible : ${error.message}`);
  return { status: "paid", periodEnd: (periodEnd as string | null) ?? null };
}

/** Nombre de marques déjà créées par l'utilisateur connecté. */
export async function projectCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  return count ?? 0;
}
