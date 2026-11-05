import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { signInAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in" };

const INPUT =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-ink";

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const next = typeof params.next === "string" ? params.next : "/dashboard";

  return (
    <div className="animate-rise">
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">
        Sign in
      </h1>
      <p className="mt-2 text-[15px] text-ink-muted">
        Welcome back. Your brands are where you left them.
      </p>

      {!isSupabaseConfigured() && (
        <p className="mt-6 rounded-xl border border-line bg-bone-deep p-3.5 text-[13px] leading-relaxed text-ink-muted">
          This server is running in local mode — accounts are disabled. Go
          straight to the{" "}
          <Link href="/dashboard" className="font-semibold underline">
            dashboard
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
          <span className="mb-1.5 block text-[13px] font-semibold">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className={INPUT}
            placeholder="you@studio.com"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold">
            Password
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
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-ink-muted">
        No account yet?{" "}
        <Link href="/signup" className="font-semibold text-ink underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
