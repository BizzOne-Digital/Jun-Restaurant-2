"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/menu";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password");
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <div className="mx-auto max-w-lg px-3 py-12 pb-[max(5rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-16">
      <h1 className="font-display text-2xl font-bold text-awok-cream sm:text-3xl">Welcome back</h1>
      <p className="mt-2 text-sm text-awok-muted">Sign in to save your details for faster checkout.</p>
      <form onSubmit={submit} className="mt-8 space-y-4 glass-panel rounded-2xl p-4 sm:p-6">
        <input
          type="email"
          required
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-awok-cream sm:text-sm"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-awok-cream sm:text-sm"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 w-full touch-manipulation rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 py-2.5 text-sm font-bold text-awok-deep disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-awok-muted">
        New here?{" "}
        <Link href="/register" className="text-awok-gold hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
