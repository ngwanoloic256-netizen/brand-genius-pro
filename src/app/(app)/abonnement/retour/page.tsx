import type { Metadata } from "next";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { confirmPayment, type ConfirmResult } from "@/lib/billing/subscription";
import { planById } from "@/lib/billing/plans";

export const metadata: Metadata = { title: "Paiement" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Page où SasPay renvoie le client après le paiement.
 *
 * Arriver ici ne prouve rien : on redemande le statut à SasPay avant
 * d'activer quoi que ce soit, et uniquement pour un paiement de l'utilisateur
 * connecté.
 */
export default async function PaymentReturnPage(
  props: PageProps<"/abonnement/retour">,
) {
  const params = await props.searchParams;
  const ref = typeof params.ref === "string" && UUID.test(params.ref) ? params.ref : null;

  const user = await getUser();
  let result: ConfirmResult = { status: "unknown" };
  let planName = "";

  if (ref && user && isAdminConfigured()) {
    const admin = createAdminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("id, user_id, plan")
      .eq("id", ref)
      .maybeSingle();

    if (payment && payment.user_id === user.id) {
      planName = planById(payment.plan).name;
      try {
        result = await confirmPayment(payment.id);
      } catch (err) {
        console.error("Confirmation du paiement impossible :", err);
        result = { status: "pending" };
      }
    }
  }

  const view = {
    paid: {
      icon: <CheckCircle2 size={26} />,
      tone: "bg-positive/12 text-positive",
      title: `Merci ! L’offre ${planName} est active.`,
      body: "Vos exports sont maintenant sans filigrane et vos nouvelles marques sont débloquées.",
    },
    pending: {
      icon: <Clock size={26} />,
      tone: "bg-acid/12 text-acid-deep",
      title: "Paiement en cours de confirmation",
      body: "Si vous avez validé le paiement sur votre téléphone, il sera confirmé dans quelques instants. Actualisez cette page dans une minute.",
    },
    failed: {
      icon: <XCircle size={26} />,
      tone: "bg-signal/12 text-signal",
      title: "Le paiement n’a pas abouti",
      body: "Aucun montant n’a été prélevé pour cette tentative. Vous pouvez réessayer.",
    },
    unknown: {
      icon: <XCircle size={26} />,
      tone: "bg-bone-deep text-ink-muted",
      title: "Paiement introuvable",
      body: "Ce lien de retour ne correspond à aucun paiement de votre compte.",
    },
  }[result.status];

  return (
    <div className="mx-auto grid min-h-[70dvh] max-w-lg place-items-center px-5 py-12 text-center">
      <div>
        <span className={`mx-auto grid size-14 place-items-center rounded-full ${view.tone}`}>
          {view.icon}
        </span>
        <h1 className="mt-6 font-display text-[clamp(1.5rem,4vw,2rem)] font-extrabold tracking-[-0.025em]">
          {view.title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{view.body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {result.status === "paid" ? (
            <ButtonLink href="/dashboard">Aller à mes marques</ButtonLink>
          ) : result.status === "pending" ? (
            <ButtonLink href={`/abonnement/retour?ref=${ref}`}>Actualiser</ButtonLink>
          ) : (
            <ButtonLink href="/abonnement">Réessayer</ButtonLink>
          )}
          <ButtonLink href="/settings" variant="ghost">
            Mon compte
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
