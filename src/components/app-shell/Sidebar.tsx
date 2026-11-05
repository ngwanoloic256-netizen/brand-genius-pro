"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  Plus,
  Settings,
  Sparkles,
  X,
  Menu,
  LogOut,
} from "lucide-react";
import { BrandGeniusLogo } from "../BrandGeniusLogo";

const NAV = [
  { href: "/dashboard", label: "Projects", icon: LayoutGrid },
  { href: "/projects/new", label: "New brand", icon: Plus },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  userEmail: string | null;
  demoMode: boolean;
}

export function Sidebar({ userEmail, demoMode }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The drawer closes on navigation, handled where navigation happens rather
  // than by watching `pathname` in an effect — the latter closes it one render
  // late and fires a cascading re-render on every route change.
  const close = () => setOpen(false);

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/dashboard" && pathname.startsWith(`${href}/`)) ||
          (href === "/dashboard" && pathname.startsWith("/projects/") &&
            pathname !== "/projects/new");

        return (
          <Link
            key={href}
            href={href}
            onClick={close}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-white/10 text-white"
                : "text-white/55 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto space-y-3 pt-6">
      {demoMode && (
        <div className="rounded-xl border border-accent-soft/25 bg-accent-soft/10 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-soft">
            <Sparkles size={12} /> Local mode
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/55">
            Running without a database. Projects live in memory and reset when
            the server restarts.
          </p>
        </div>
      )}

      {userEmail ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-acid text-[12px] font-extrabold text-white">
            {userEmail.slice(0, 2).toUpperCase()}
          </div>
          <span className="min-w-0 flex-1 truncate text-xs text-white/65">
            {userEmail}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              aria-label="Sign out"
              className="grid size-7 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={14} />
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/login"
          onClick={close}
          className="block rounded-xl bg-white/5 p-3 text-xs text-white/65 transition-colors hover:bg-white/10 hover:text-white"
        >
          Sign in to save your work →
        </Link>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bone/90 px-4 py-3 backdrop-blur md:hidden">
        <BrandGeniusLogo compact={false} />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="grid size-9 place-items-center rounded-lg border border-line bg-white"
        >
          <Menu size={18} />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/45 animate-fade"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(80vw,280px)] flex-col bg-ink p-5 animate-rise">
            <div className="mb-8 flex items-center justify-between text-white">
              <BrandGeniusLogo />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      )}

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col bg-ink p-5 text-white md:flex">
        <div className="mb-9 px-1">
          <BrandGeniusLogo />
        </div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
