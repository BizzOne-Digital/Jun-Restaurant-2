/**
 * Set `ORDER_EMAIL_TRACE_LOG=1` on the server (e.g. Vercel) for temporary diagnostics.
 * Never pass API keys or webhook signing secrets into this helper.
 */
export function traceOrderEmail(msg: string, data?: Record<string, unknown>): void {
  if (process.env.ORDER_EMAIL_TRACE_LOG !== "1") return;
  console.info("[email-trace]", msg, data ?? {});
}
