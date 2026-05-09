import { escapeHtml } from "@/lib/email/escape-html";

export type StatusNotifyKind = "completed" | "cancelled";

export type OrderStatusCtx = {
  restaurantName: string;
  logoUrl?: string | null;
  addressLines?: string[];
  orderNumber: string;
  orderId: string;
};

export function buildOrderStatusSubject(restaurantName: string): string {
  return `Online order update — ${restaurantName}`;
}

function badge(kind: StatusNotifyKind): { label: string; bg: string; fg: string } {
  if (kind === "completed") return { label: "Completed", bg: "#0d6e3f", fg: "#ffffff" };
  return { label: "Cancelled", bg: "#8b1e1e", fg: "#ffffff" };
}

export function buildOrderStatusHtml(kind: StatusNotifyKind, ctx: OrderStatusCtx): string {
  const b = badge(kind);
  const name = escapeHtml(ctx.restaurantName);
  const logoBlock = ctx.logoUrl
    ? `<img src="${escapeHtml(ctx.logoUrl)}" alt="${name}" width="120" style="max-width:120px;height:auto;display:block;border:0;" />`
    : `<p style="margin:0;font-size:20px;font-weight:bold;color:#111;">${name}</p>`;

  const addr = (ctx.addressLines ?? []).map((l) => escapeHtml(l)).join("<br/>");

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f4;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:640px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;">
      <tr><td style="padding:24px;text-align:center;">${logoBlock}</td></tr>
      <tr><td style="padding:0 24px 24px;font-size:15px;color:#333;line-height:1.6;">
        <p style="margin:0 0 16px;text-align:center;">
          <span style="display:inline-block;padding:8px 16px;border-radius:999px;background:${b.bg};color:${b.fg};font-weight:600;font-size:14px;">${b.label}</span>
        </p>
        <p style="margin:0 0 8px;">Your order <strong>#${escapeHtml(ctx.orderNumber)}</strong> has been marked <strong>${escapeHtml(
          b.label.toLowerCase()
        )}</strong>.</p>
        <p style="margin:0;font-size:13px;color:#666;">Order ID: ${escapeHtml(ctx.orderId)}</p>
        ${addr ? `<p style="margin:16px 0 0;font-size:13px;color:#666;">${addr}</p>` : ""}
      </td></tr>
      <tr><td style="padding:16px 24px;font-size:12px;color:#888;border-top:1px solid #eee;">
        This is an automated message from ${name}.
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

export function buildOrderStatusText(kind: StatusNotifyKind, ctx: OrderStatusCtx): string {
  const b = badge(kind);
  const lines = [
    `${ctx.restaurantName}`,
    "",
    `Order #${ctx.orderNumber} (${ctx.orderId})`,
    `Status: ${b.label}`,
    "",
    ...((ctx.addressLines ?? []).length ? ["", ...ctx.addressLines!] : []),
    "",
    `This is an automated message from ${ctx.restaurantName}.`,
  ];
  return lines.join("\n");
}
