"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { absoluteUrl } from "@/lib/site-url";

/**
 * Email + password authentication backed by Supabase Auth.
 *
 * Errors come back as a redirect query parameter rather than a thrown error so
 * the form can render them without a client-side state machine.
 */

const CredentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128),
});

/** Only same-origin paths are accepted as a post-login destination. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function failure(route: string, message: string, next: string): never {
  redirect(
    `${route}?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
  );
}

export async function signInAction(formData: FormData) {
  const next = safeNext(formData.get("next"));

  if (!isSupabaseConfigured()) {
    failure("/login", "Authentication is not configured on this server.", next);
  }

  const parsed = CredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    failure("/login", parsed.error.issues[0].message, next);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Supabase already returns a deliberately vague message here; keep it
    // rather than distinguishing "no such user" from "wrong password".
    failure("/login", error.message, next);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const next = safeNext(formData.get("next"));

  if (!isSupabaseConfigured()) {
    failure("/signup", "Authentication is not configured on this server.", next);
  }

  const parsed = CredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    failure("/signup", parsed.error.issues[0].message, next);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: absoluteUrl(
        `/auth/callback?next=${encodeURIComponent(next)}`,
      ),
    },
  });

  if (error) failure("/signup", error.message, next);

  // With email confirmation enabled, no session exists yet.
  if (!data.session) {
    redirect(`/signup?pending=1&email=${encodeURIComponent(parsed.data.email)}`);
  }

  revalidatePath("/", "layout");
  redirect(next);
}
