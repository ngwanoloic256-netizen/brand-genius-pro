import type { Metadata } from "next";
import { Check, CreditCard, Database, KeyRound, X } from "lucide-react";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { hasApiKey } from "@/lib/ai/client";
import { QUOTAS } from "@/lib/rate-limit";
import { QUOTA_FR } from "@/lib/labels-fr";
import { ButtonLink } from "@/components/ui/Button";
import { currentSubscription } from "@/lib/billing/subscription";
import { isSaspayConfigured } from "@/lib/billing/saspay";
import { isAdminConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Paramètres" };

// Reflects the signed-in user and live service configuration.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getUser() : null;
  const modelConfigured = hasApiKey();
  const { plan, periodEnd } = await currentSubscription();
  const paidActive = plan.id !== "free" && periodEnd;

  return (
    <>
      <PageHeader
        eyebrow="Compte"
        title="Paramètres"
        description="Votre compte, votre abonnement et les services connectés à cet espace."
      />

      <div className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8 sm:px-8">
        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-bold">Compte</h2>
          {user ? (
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[13px] font-semibold">E-mail</dt>
                <dd className="mt-1 text-[15px] text-ink-muted">{user.email}</dd>
              </div>
              <div>
                <dt className="text-[13px] font-semibold">Identifiant</dt>
                <dd className="mt-1 truncate font-mono text-[12px] text-ink-muted">
                  {user.id}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="mt-5">
              <p className="text-[15px] text-ink-muted">
                {configured
                  ? "Vous n’êtes pas connecté."
                  : "Mode local : pas de comptes, rien n’est enregistré."}
              </p>
              {configured && (
                <ButtonLink href="/login" size="sm" className="mt-4">
                  Se connecter
                </ButtonLink>
              )}
            </div>
          )}
        </section>

        {configured && user && (
          <section className="rounded-xl border border-line bg-white p-6">
            <h2 className="font-display text-lg font-bold">Abonnement</h2>
            <p className="mt-1.5 text-[15px] text-ink-muted">
              {paidActive
                ? `Offre ${plan.name}, active jusqu’au ${new Date(periodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.`
                : "Offre gratuite : une marque, exports avec filigrane."}
            </p>
            <ButtonLink href="/abonnement" size="sm" className="mt-4">
              {paidActive ? "Prolonger mon offre" : "Passer à Pro"}
            </ButtonLink>
          </section>
        )}

        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-bold">Services</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            L’application fonctionne sans ces services : les projets restent en mémoire et les identités sont calculées sans IA. Configurez-les pour avoir de vrais comptes et des logos dessinés par l’IA.
          </p>

          <ul className="mt-5 space-y-2.5">
            <ServiceRow
              icon={<Database size={16} />}
              label="Supabase"
              detail="Base de données, comptes et stockage des fichiers"
              env="NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY"
              ok={configured}
            />
            <ServiceRow
              icon={<KeyRound size={16} />}
              label="Anthropic API"
              detail="Stratégie de marque, palette, polices et logos"
              env="ANTHROPIC_API_KEY"
              ok={modelConfigured}
            />
            <ServiceRow
              icon={<CreditCard size={16} />}
              label="SasPay"
              detail="Paiement des abonnements par Mobile Money ou carte"
              env="SASPAY_SECRET_KEY · SASPAY_WEBHOOK_SECRET · SUPABASE_SERVICE_ROLE_KEY"
              ok={isSaspayConfigured() && isAdminConfigured()}
            />
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-bold">Limites de création</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            La création utilise une IA payante : chaque opération est limitée par compte et par heure.
          </p>

          <div className="scroll-x mt-5">
            <table className="w-full min-w-[380px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                  <th className="pb-2 font-bold">Opération</th>
                  <th className="pb-2 font-bold">Par heure</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {Object.entries(QUOTAS).map(([kind, quota]) => (
                  <tr key={kind} className="border-b border-line-soft">
                    <td className="py-2 capitalize">{QUOTA_FR[kind] ?? kind}</td>
                    <td className="py-2 text-ink-muted">{quota.limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function ServiceRow({
  icon,
  label,
  detail,
  env,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  env: string;
  ok: boolean;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-line bg-bone/50 p-4">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-ink-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{label}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
              ok
                ? "bg-positive/12 text-positive-deep"
                : "bg-bone-deep text-ink-muted"
            }`}
          >
            {ok ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
            {ok ? "Connecté" : "Non configuré"}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-ink-muted">{detail}</p>
        <p className="mt-1.5 break-all font-mono text-[11px] text-ink-muted">
          {env}
        </p>
      </div>
    </li>
  );
}
