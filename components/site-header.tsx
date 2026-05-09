"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { useCart, cartLineCount } from "@/components/cart/cart-provider";

const links = [
  { href: "/menu", label: "Menu" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/#hours", label: "Hours" },
];

export function SiteHeader() {
  const { data: session } = useSession();
  const { lines } = useCart();
  const count = cartLineCount(lines);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-awok-deep/80 backdrop-blur-xl supports-[backdrop-filter]:bg-awok-deep/70">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4 md:px-6">
        <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-4">
          <Link href="/" className="group flex min-w-0 max-w-[65%] items-center gap-2 sm:max-w-none sm:gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="relative h-11 w-11 rounded-2xl ring-1 ring-white/0 transition-shadow duration-300 group-hover:shadow-[0_0_32px_rgba(255,107,44,0.35)] group-hover:ring-awok-ember/35 md:h-12 md:w-12"
            >
              <Image src="/awok-logo.png" alt="A Wok" fill className="object-contain drop-shadow-glow" sizes="48px" />
            </motion.div>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-base font-bold tracking-wide text-awok-cream sm:text-lg md:text-xl">
                A Wok
              </p>
              <p className="truncate text-[10px] uppercase tracking-[0.15em] text-awok-muted sm:text-[11px] sm:tracking-[0.2em]">
                Hayward
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-awok-muted transition hover:text-awok-cream"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            {session?.user?.role === "admin" && (
              <Link
                href="/admin"
                className="hidden rounded-full border border-awok-gold/30 px-3 py-1.5 text-xs font-semibold text-awok-gold transition hover:border-awok-gold/60 md:inline-block"
              >
                Admin
              </Link>
            )}
            {session?.user && session.user.role === "customer" && (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden text-xs text-awok-muted hover:text-awok-cream md:inline"
              >
                Sign out
              </button>
            )}
            {!session && (
              <Link href="/login" className="hidden text-sm text-awok-muted hover:text-awok-cream md:inline">
                Sign in
              </Link>
            )}
            <Link href="/cart" className="relative inline-flex shrink-0 touch-manipulation">
              <motion.span
                whileTap={{ scale: 0.96 }}
                className="rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 px-3 py-2 text-xs font-semibold text-awok-deep shadow-glow sm:px-4 sm:text-sm"
              >
                Cart{count > 0 ? ` (${count})` : ""}
              </motion.span>
            </Link>
          </div>
        </div>

        <nav className="mt-2 flex gap-3 overflow-x-auto border-t border-white/5 pt-2 pb-0.5 text-xs [-webkit-overflow-scrolling:touch] md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="shrink-0 whitespace-nowrap text-awok-muted">
              {l.label}
            </Link>
          ))}
          {session?.user?.role === "admin" && (
            <Link href="/admin" className="shrink-0 whitespace-nowrap font-semibold text-awok-gold">
              Admin
            </Link>
          )}
          {!session && (
            <Link href="/login" className="shrink-0 whitespace-nowrap text-awok-gold">
              Sign in
            </Link>
          )}
          {session?.user?.role === "customer" && (
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="shrink-0 whitespace-nowrap text-awok-muted">
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
