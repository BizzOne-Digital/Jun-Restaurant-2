import { Suspense } from "react";
import OrderSuccessInner from "./order-success-inner";

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-awok-muted">Loading…</div>}>
      <OrderSuccessInner />
    </Suspense>
  );
}
