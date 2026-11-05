import { Sidebar } from "@/components/app-shell/Sidebar";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * The signed-in application shell: persistent rail on desktop, hamburger
 * drawer on mobile.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const configured = isSupabaseConfigured();
  const user = configured ? await getUser() : null;

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar userEmail={user?.email ?? null} demoMode={!configured} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
