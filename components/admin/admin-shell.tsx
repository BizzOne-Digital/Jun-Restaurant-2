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
  { href: "/admin/payouts", label: "Payouts" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-[#07080b] text-awok-cream">
      <aside className="hidden w-56 shrink-0 border-r border-white/5 bg-black/40 p-4 md:block">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-awok-gold">A Wok</p>
        <p className="mt-1 text-sm text-awok-muted">Admin</p>
        <nav className="mt-8 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === n.href ? "bg-white/10 text-awok-cream" : "text-awok-muted hover:bg-white/5"
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
            className="flex gap-1 overflow-x-auto border-b border-white/5 px-2 py-2 [-webkit-overflow-scrolling:touch]"
            aria-label="Admin sections"
          >
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium ${
                  pathname === n.href ? "bg-white/10 text-awok-cream" : "text-awok-muted"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-8">{children}</div>
      </div>
    </div>
  );
}
