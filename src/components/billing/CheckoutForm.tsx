"use client";

import { useState } from "react";
import { AlertCircle, Check, Loader2, Lock, Smartphone } from "lucide-react";
import { Button } from "../ui/Button";
import {
  CYCLE_LABEL,
  PLANS,
  annualPerMonth,
  formatFcfa,
  priceFor,
  type BillingCycle,
  type PaidPlanId,
} from "@/lib/billing/plans";

/**
 * Choix de l'offre et de la durée, puis redirection vers la page SasPay.
 *
 * Le navigateur n'envoie que l'offre et la durée : le serveur recalcule le
 * montant à partir de `PLANS`.
 */
export function CheckoutForm({
  initialPlan,
  initialCycle,
  enabled,
}: {
  initialPlan: PaidPlanId;
  initialCycle: BillingCycle;
  enabled: boolean;
}) {
  const [planId, setPlanId] = useState<PaidPlanId>(initialPlan);
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paid = PLANS.filter((p) => p.id !== "free");
  const plan = paid.find((p) => p.id === planId) ?? paid[0];
  const amount = priceFor(plan, cycle);

  async function pay() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, cycle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Le paiement n’a pas pu démarrer.");
      }
      window.location.assign(data.url);
    } catch (err) {
      setWorking(false);
      setError(err instanceof Error ? err.message : "Le paiement n’a pas pu démarrer.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <fieldset>
          <legend className="text-eyebrow mb-3">1. Votre offre</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {paid.map((p) => {
              const selected = p.id === planId;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPlanId(p.id as PaidPlanId)}
                  className={`rounded-xl border-2 bg-white p-5 text-left transition-all ${
                    selected ? "border-ink shadow-lift" : "border-line hover:border-ink-faint"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display text-xl font-extrabold">{p.name}</span>
                    {selected && (
                      <span className="grid size-5 place-items-center rounded-full bg-ink text-bone">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">
                    {p.tagline}
                  </span>
                  <ul className="mt-4 space-y-1.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px]">
                        <Check size={14} className="mt-0.5 shrink-0 text-positive" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-eyebrow mb-3">2. La durée</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["monthly", "annual"] as const).map((c) => {
              const selected = c === cycle;
              const price = priceFor(plan, c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCycle(c)}
                  className={`rounded-xl border-2 bg-white p-5 text-left transition-all ${
                    selected ? "border-ink shadow-lift" : "border-line hover:border-ink-faint"
                  }`}
                >
                  <span className="block text-[13px] font-semibold">
                    {c === "monthly" ? "Au mois" : "À l’année"}
                  </span>
                  <span className="mt-1 block font-display text-2xl font-extrabold tabular-nums">
                    {formatFcfa(price)} FCFA
                  </span>
                  <span className="mt-1 block text-[12px] text-ink-muted">
                    {c === "monthly"
                      ? "Valable 30 jours"
                      : `Soit ${formatFcfa(annualPerMonth(plan))} FCFA par mois, valable 365 jours`}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <aside className="h-fit rounded-xl border border-line bg-white p-6 lg:sticky lg:top-6">
        <p className="text-eyebrow mb-3">Récapitulatif</p>
        <dl className="space-y-2 text-[14px]">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Offre</dt>
            <dd className="font-semibold">{plan.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Durée</dt>
            <dd className="font-semibold">{CYCLE_LABEL[cycle]}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-line pt-3">
            <dt className="font-semibold">Total</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">
              {formatFcfa(amount)} FCFA
            </dd>
          </div>
        </dl>

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-signal/30 bg-signal/5 p-3 text-[13px] text-signal-deep"
          >
            <AlertCircle size={15} className="mt-px shrink-0" />
            {error}
          </p>
        )}

        <Button
          size="lg"
          className="mt-5 w-full"
          onClick={pay}
          disabled={working || !enabled}
        >
          {working ? (
            <>
              <Loader2 size={16} className="animate-spin-slow" /> Redirection vers SasPay…
            </>
          ) : (
            <>
              <Lock size={15} /> Payer {formatFcfa(amount)} FCFA
            </>
          )}
        </Button>

        {!enabled && (
          <p className="mt-3 text-[12px] leading-relaxed text-signal-deep">
            Le paiement en ligne n’est pas encore activé sur ce site.
          </p>
        )}

        <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-ink-muted">
          <Smartphone size={14} className="mt-px shrink-0" />
          Paiement sécurisé par SasPay : Mobile Money (MTN, Orange) ou carte. Pas
          de renouvellement automatique : vous payez à nouveau quand vous voulez
          prolonger.
        </p>
      </aside>
    </div>
  );
}
