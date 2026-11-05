"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";

import {
  BEST_SAVING,
  PLANS,
  annualPerMonth,
  formatFcfa,
  type Plan,
} from "@/lib/billing/plans";

/**
 * Tarifs avec le choix mensuel / annuel.
 *
 * L'annuel est affiché en équivalent mensuel avec le montant réellement payé
 * en dessous : annoncer « 8 300 » puis prélever 99 000 d'un coup est ce qui
 * fait perdre confiance. Les prix et l'économie viennent de `PLANS`, la même
 * source que le paiement SasPay.
 */

function hrefFor(plan: Plan, annual: boolean): string {
  if (plan.id === "free") return "/projects/new";
  return `/abonnement?plan=${plan.id}&cycle=${annual ? "annual" : "monthly"}`;
}

export function PricingPlans() {
  const [annual, setAnnual] = useState(true);

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <span
          className={`text-sm font-semibold transition-colors ${
            annual ? "text-white/60" : "text-white"
          }`}
        >
          Mensuel
        </span>

        <button
          role="switch"
          aria-checked={annual}
          aria-label="Paiement annuel"
          onClick={() => setAnnual((v) => !v)}
          className="relative h-7 w-14 rounded-full bg-white/12 p-1 transition-colors hover:bg-white/20"
        >
          <span
            className={`block size-5 rounded-full bg-iris-bright transition-transform duration-300 ${
              annual ? "translate-x-7" : "translate-x-0"
            }`}
          />
        </button>

        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold transition-colors ${
              annual ? "text-white" : "text-white/60"
            }`}
          >
            Annuel
          </span>
          <span className="rounded-full border border-iris-soft/30 bg-iris/25 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-iris-soft">
            −{BEST_SAVING} %
          </span>
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const price = annual ? annualPerMonth(plan) : plan.monthly;

          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-3xl p-8 transition-transform duration-200 hover:-translate-y-1 sm:p-10 ${
                plan.featured
                  ? "bg-iris shadow-[0_24px_80px_-20px_rgb(79_70_229_/_0.7)]"
                  : "glass-night"
              }`}
            >
              {plan.featured && (
                <span className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85">
                  Le plus choisi
                </span>
              )}

              <h3 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
                {plan.name}
              </h3>

              <p className="mt-3 font-display text-[2.75rem] font-extrabold leading-none tracking-[-0.04em]">
                {formatFcfa(price)}
                <span
                  className={`ml-1.5 text-sm font-medium tracking-normal ${
                    plan.featured ? "text-white/85" : "text-white/65"
                  }`}
                >
                  {plan.monthly === 0 ? "FCFA, pour toujours" : "FCFA / mois"}
                </span>
              </p>

              <p
                className={`mt-2 h-5 text-[12px] font-semibold uppercase tracking-[0.08em] ${
                  plan.featured ? "text-white/90" : "text-iris-soft"
                }`}
              >
                {annual && plan.monthly > 0
                  ? `Soit ${formatFcfa(plan.annual)} FCFA payés pour un an`
                  : ""}
              </p>

              <p
                className={`mt-4 text-[14px] leading-relaxed ${
                  plan.featured ? "text-white/90" : "text-white/70"
                }`}
              >
                {plan.tagline}
              </p>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-[14px]">
                    <Check
                      size={15}
                      strokeWidth={3}
                      className={`mt-1 shrink-0 ${
                        plan.featured ? "text-white" : "text-iris-soft"
                      }`}
                    />
                    <span className={plan.featured ? "text-white/90" : ""}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={hrefFor(plan, annual)}
                className={`mt-9 inline-flex h-12 items-center justify-center rounded-xl text-[13px] font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-90 ${
                  plan.featured
                    ? "bg-white text-night"
                    : "bg-white/12 text-white hover:bg-white/20"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
