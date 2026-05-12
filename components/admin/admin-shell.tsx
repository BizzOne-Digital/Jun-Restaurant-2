"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-[#121212] text-awok-cream">
      <aside className="hidden w-56 shrink-0 border-r border-white/[0.06] bg-[#0d0d0d] p-4 md:block">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#d4af37]">A Wok</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-awok-muted">Admin</p>
        <nav className="mt-8 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                pathname === n.href
                  ? "bg-[#2a2a2a] text-white"
                  : "text-awok-muted hover:bg-white/[0.04] hover:text-awok-cream"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-10 w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-awok-muted hover:text-awok-cream"
        >
          Sign out
        </button>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="md:hidden">
          <header className="flex items-center justify-between border-b border-white/5 px-3 py-2.5">
            <p className="text-sm font-semibold">A Wok · Admin</p>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-awok-muted"
            >
              Sign out
            </button>
          </header>
          <nav
            className="flex gap-1 overflow-x-auto border-b border-white/5 px-2 py-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Admin sections"
          >
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`shrink-0 touch-manipulation rounded-xl px-3 py-2.5 text-xs font-medium ${
                  pathname === n.href ? "bg-[#2a2a2a] text-white" : "text-awok-muted"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="min-w-0 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
