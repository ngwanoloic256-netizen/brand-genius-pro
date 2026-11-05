"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";

/**
 * Pricing, with the monthly/annual switch.
 *
 * The annual figure is shown as the per-month equivalent with the full charge
 * stated underneath, because quoting "€20" and billing €240 once is the thing
 * that makes people distrust a pricing page. The saving is computed from the
 * two real numbers rather than typed in, so it cannot drift out of step with
 * the prices when they change.
 */

interface Plan {
  name: string;
  monthly: number;
  annualMonthly: number;
  tagline: string;
  features: string[];
  cta: string;
  href: string;
  featured: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Free",
    monthly: 0,
    annualMonthly: 0,
    tagline: "See the whole system before paying for it.",
    features: [
      "1 brand project",
      "Full guide on screen",
      "Watermarked exports",
      "4 mockups",
    ],
    cta: "Start free",
    href: "/projects/new",
    featured: false,
  },
  {
    name: "Pro",
    monthly: 24,
    annualMonthly: 19,
    tagline: "For founders and in-house teams shipping one brand properly.",
    features: [
      "Unlimited brand projects",
      "HD exports, no watermark",
      "Full PDF brand guide",
      "12 mockups per project",
      "Regenerate any section",
    ],
    cta: "Choose Pro",
    href: "/signup",
    featured: true,
  },
  {
    name: "Studio",
    monthly: 79,
    annualMonthly: 63,
    tagline: "For agencies running client work at volume.",
    features: [
      "Everything in Pro",
      "Unlimited client brands",
      "Multi-user workspace",
      "Shared asset library",
      "Priority generation",
    ],
    cta: "Choose Studio",
    href: "/signup",
    featured: false,
  },
];

/** Largest annual saving across the paid plans, as a whole percent. */
const BEST_SAVING = Math.max(
  ...PLANS.filter((p) => p.monthly > 0).map((p) =>
    Math.round((1 - p.annualMonthly / p.monthly) * 100),
  ),
);

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
          Monthly
        </span>

        <button
          role="switch"
          aria-checked={annual}
          aria-label="Bill annually"
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
            Annual
          </span>
          <span className="rounded-full border border-iris-soft/30 bg-iris/25 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-iris-soft">
            Save {BEST_SAVING}%
          </span>
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const price = annual ? plan.annualMonthly : plan.monthly;

          return (
            <div
              key={plan.name}
              className={`flex flex-col rounded-3xl p-8 transition-transform duration-200 hover:-translate-y-1 sm:p-10 ${
                plan.featured
                  ? "bg-iris shadow-[0_24px_80px_-20px_rgb(79_70_229_/_0.7)]"
                  : "glass-night"
              }`}
            >
              {plan.featured && (
                <span className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85">
                  Most popular
                </span>
              )}

              <h3 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
                {plan.name}
              </h3>

              <p className="mt-3 font-display text-[2.75rem] font-extrabold leading-none tracking-[-0.04em]">
                €{price}
                <span
                  className={`ml-1 text-sm font-medium ${
                    plan.featured ? "text-white/85" : "text-white/65"
                  }`}
                >
                  {plan.monthly === 0 ? "forever" : "/month"}
                </span>
              </p>

              <p
                className={`mt-2 h-5 text-[12px] font-semibold uppercase tracking-[0.08em] ${
                  plan.featured ? "text-white/90" : "text-iris-soft"
                }`}
              >
                {annual && plan.monthly > 0
                  ? `Billed €${plan.annualMonthly * 12} a year`
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
                href={plan.href}
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
