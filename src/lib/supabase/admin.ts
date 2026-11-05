import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Client Supabase avec la clé service_role.
 *
 * Il contourne la RLS : on ne l'utilise que pour écrire ce qu'un utilisateur
 * ne doit jamais pouvoir écrire lui-même (paiements, abonnements). La clé vit
 * dans `SUPABASE_SERVICE_ROLE_KEY`, côté serveur uniquement.
 */

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

export function isAdminConfigured(): boolean {
  return isSupabaseConfigured() && SERVICE_ROLE_KEY.length > 0;
}

export function createAdminClient() {
  if (!isAdminConfigured()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manque : impossible d’enregistrer le paiement.",
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
