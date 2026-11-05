import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { CheckoutForm } from "@/components/billing/CheckoutForm";
import { currentSubscription } from "@/lib/billing/subscription";
import { isSaspayConfigured } from "@/lib/billing/saspay";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { isCycle, isPaidPlan } from "@/lib/billing/plans";

export const metadata: Metadata = { title: "Abonnement" };
export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function SubscriptionPage(props: PageProps<"/abonnement">) {
  const params = await props.searchParams;
  const plan = typeof params.plan === "string" && isPaidPlan(params.plan) ? params.plan : "pro";
  const cycle =
    typeof params.cycle === "string" && isCycle(params.cycle) ? params.cycle : "annual";

  const { plan: current, periodEnd } = await currentSubscription();
  const active = current.id !== "free" && periodEnd;

  return (
    <>
      <PageHeader
        eyebrow="Abonnement"
        title={active ? `Offre ${current.name}` : "Passer à l’offre supérieure"}
        description={
          active
            ? `Votre offre est active jusqu’au ${formatDate(periodEnd)}. Un nouveau paiement prolonge la période en cours.`
            : "Choisissez une offre et une durée, puis payez par Mobile Money ou carte avec SasPay. L’offre est activée dès la confirmation du paiement."
        }
      />
      <div className="px-5 py-8 sm:px-8 lg:px-12">
        <CheckoutForm
          initialPlan={plan}
          initialCycle={cycle}
          enabled={isSaspayConfigured() && isAdminConfigured()}
        />
      </div>
    </>
  );
}
