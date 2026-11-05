import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Sign-out is POST-only so a stray link or prefetch cannot end a session.
 */
export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/login", new URL(request.url).origin), {
    status: 303,
  });
}
