import { Suspense } from "react";
import CheckoutInner from "./checkout-inner";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-awok-muted">Loading checkout…</div>}>
      <CheckoutInner />
    </Suspense>
  );
}
