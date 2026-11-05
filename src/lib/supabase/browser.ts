"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "./config";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Browser-side Supabase client. Returns null when credentials are absent. */
export function getBrowserClient() {
  if (!isSupabaseConfigured()) return null;
  if (!cached) {
    cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return cached;
}
