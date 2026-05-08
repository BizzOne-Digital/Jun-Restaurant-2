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
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/40 p-8 glass-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-awok-gold">A Wok</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-awok-cream">Admin sign in</h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input
            type="email"
            required
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-awok-cream"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-awok-cream"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 py-2.5 text-sm font-bold text-awok-deep disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Enter dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
