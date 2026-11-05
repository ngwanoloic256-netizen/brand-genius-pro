import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, MailCheck } from "lucide-react";
import { signUpAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Créer un compte" };

const INPUT =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-ink";

export default async function SignupPage(props: PageProps<"/signup">) {
  const params = await props.searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const pending = params.pending === "1";
  const email = typeof params.email === "string" ? params.email : null;
  const next = typeof params.next === "string" ? params.next : "/dashboard";

  if (pending) {
    return (
      <div className="animate-rise">
        <span className="mb-5 grid size-11 place-items-center rounded-full bg-positive/12 text-positive">
          <MailCheck size={20} />
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">
          Vérifiez votre boîte mail
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
          Nous avons envoyé un lien de confirmation{email ? ` à ${email}` : ""}. Ouvrez-le pour
          activer le compte, puis connectez-vous.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-block text-[13px] font-semibold text-ink underline"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-rise">
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">
        Créer un compte
      </h1>
      <p className="mt-2 text-[15px] text-ink-muted">
        Une marque gratuite, sans paiement. Passez à l’offre supérieure quand vous en avez besoin.
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

      <form action={signUpAction} className="mt-7 grid gap-4">
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
            autoComplete="new-password"
            required
            minLength={8}
            className={INPUT}
            placeholder="Au moins 8 caractères"
          />
        </label>

        <Button type="submit" size="lg" className="mt-2 w-full">
          Créer mon compte
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-ink-muted">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-semibold text-ink underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
