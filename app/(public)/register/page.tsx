"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error?.formErrors?.fieldErrors?.email?.[0] ?? data.error ?? "Could not register");
      return;
    }
    await signIn("credentials", { email, password, callbackUrl: "/menu", redirect: true });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 pb-[max(5rem,env(safe-area-inset-bottom))]">
      <h1 className="font-display text-3xl font-bold text-awok-cream">Create account</h1>
      <p className="mt-2 text-sm text-awok-muted">Join A Wok for faster reorders and saved preferences.</p>
      <form onSubmit={submit} className="mt-8 space-y-4 glass-panel rounded-2xl p-6">
        <input
          required
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-awok-cream"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          required
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-awok-cream"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-awok-cream"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={8}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-awok-cream"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 py-2.5 text-sm font-bold text-awok-deep disabled:opacity-60"
        >
          {loading ? "Creating…" : "Register"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-awok-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-awok-gold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
