import { Suspense } from "react";
import { AdminLoginForm } from "./admin-login-form";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-awok-muted">Loading…</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
