import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { signInAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Connexion" };

const INPUT =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-ink";

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const next = typeof params.next === "string" ? params.next : "/dashboard";

  return (
    <div className="animate-rise">
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">
        Connexion
      </h1>
      <p className="mt-2 text-[15px] text-ink-muted">
        Bon retour. Vos marques vous attendent.
      </p>

      {!isSupabaseConfigured() && (
        <p className="mt-6 rounded-xl border border-line bg-bone-deep p-3.5 text-[13px] leading-relaxed text-ink-muted">
          Ce serveur tourne en mode local : les comptes sont désactivés. Allez
          directement au{" "}
          <Link href="/dashboard" className="font-semibold underline">
            tableau de bord
          </Link>
          .
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-xl border border-signal/30 bg-signal/5 p-3.5 text-[13px] text-signal-deep"
        >
          <AlertCircle size={16} className="mt-px shrink-0" />
          {error}
        </p>
      )}

      <form action={signInAction} className="mt-7 grid gap-4">
        <input type="hidden" name="next" value={next} />

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold">E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className={INPUT}
            placeholder="vous@entreprise.com"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold">
            Mot de passe
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            className={INPUT}
            placeholder="••••••••"
          />
        </label>

        <Button type="submit" size="lg" className="mt-2 w-full">
          Se connecter
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-ink-muted">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-semibold text-ink underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
