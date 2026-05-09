"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid credentials");
      return;
    }
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    if (session?.user?.role !== "admin") {
      toast.error("Admin access only");
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-3 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-5 sm:rounded-3xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-awok-gold">A Wok</p>
        <h1 className="mt-2 font-display text-xl font-bold text-awok-cream sm:text-2xl">Admin sign in</h1>
        <form onSubmit={submit} className="mt-6 space-y-4 sm:mt-8">
          <input
            type="email"
            required
            className="min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-base text-awok-cream sm:text-sm"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            className="min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-base text-awok-cream sm:text-sm"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full touch-manipulation rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 py-2.5 text-sm font-bold text-awok-deep disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Enter dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
