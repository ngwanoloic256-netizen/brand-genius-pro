import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Email-confirmation and OAuth landing route. Exchanges the one-time code for
 * a session, then forwards to the originally requested page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/dashboard";

  // Only same-origin paths — an open redirect here would be a phishing vector.
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (!isSupabaseConfigured() || !code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("That link has expired. Request a new one.")}`,
        url.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
