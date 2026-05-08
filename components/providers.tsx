"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { Toaster } from "sonner";
import { CartProvider } from "@/components/cart/cart-provider";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <CartProvider>
        {children}
        <Toaster richColors position="top-center" />
      </CartProvider>
    </SessionProvider>
  );
}
