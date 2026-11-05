import type { Metadata } from "next";
import { Check, Database, KeyRound, X } from "lucide-react";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { hasApiKey } from "@/lib/ai/client";
import { QUOTAS } from "@/lib/rate-limit";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Settings" };

// Reflects the signed-in user and live service configuration.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getUser() : null;
  const modelConfigured = hasApiKey();

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your account, the organisation, and the services this workspace is wired to."
      />

      <div className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8 sm:px-8">
        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-bold">Account</h2>
          {user ? (
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[13px] font-semibold">Email</dt>
                <dd className="mt-1 text-[15px] text-ink-muted">{user.email}</dd>
              </div>
              <div>
                <dt className="text-[13px] font-semibold">User ID</dt>
                <dd className="mt-1 truncate font-mono text-[12px] text-ink-muted">
                  {user.id}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="mt-5">
              <p className="text-[15px] text-ink-muted">
                {configured
                  ? "You are not signed in."
                  : "Running in local mode — no accounts, no persistence."}
              </p>
              {configured && (
                <ButtonLink href="/login" size="sm" className="mt-4">
                  Sign in
                </ButtonLink>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-bold">Services</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            The app runs without either service — projects live in memory and
            identities are generated deterministically. Configure both for real
            accounts and model-generated marks.
          </p>

          <ul className="mt-5 space-y-2.5">
            <ServiceRow
              icon={<Database size={16} />}
              label="Supabase"
              detail="Database, authentication, and asset storage"
              env="NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY"
              ok={configured}
            />
            <ServiceRow
              icon={<KeyRound size={16} />}
              label="Anthropic API"
              detail="Brand strategy, palette, typography, and logo marks"
              env="ANTHROPIC_API_KEY"
              ok={modelConfigured}
            />
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-bold">Generation limits</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            Generation endpoints call a paid model API, so each one is capped
            per account per hour.
          </p>

          <div className="scroll-x mt-5">
            <table className="w-full min-w-[380px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                  <th className="pb-2 font-bold">Operation</th>
                  <th className="pb-2 font-bold">Per hour</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {Object.entries(QUOTAS).map(([kind, quota]) => (
                  <tr key={kind} className="border-b border-line-soft">
                    <td className="py-2 capitalize">{kind}</td>
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
            {ok ? "Connected" : "Not configured"}
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
