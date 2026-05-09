import { formatCents } from "@/lib/utils";
import { escapeHtml } from "@/lib/email/escape-html";
import type { OrderLineForEmail, OrderPayloadForConfirmation } from "@/lib/emailTemplates/orderConfirmation";

export type AdminNewOrderCtx = {
  siteOrigin: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  restaurantName: string;
  logoUrl?: string | null;
  addressLines?: string[];
};

export type AdminOrderContact = {
  name: string;
  email: string;
  phone: string;
};

export function buildAdminNewOrderSubject(orderNumber: string, totalCents: number, restaurantName: string): string {
  return `New paid order — ${restaurantName} — #${orderNumber} — ${formatCents(totalCents)}`;
}

function lineRowsHtml(order: OrderPayloadForConfirmation): string {
  return order.items
    .map((it: OrderLineForEmail) => {
      const opts =
        it.selectedOptions?.map((o) => `${escapeHtml(o.name)}: ${escapeHtml(o.value)}`).join(" · ") ?? "";
      const notes = it.notes?.trim() ? `<br/><span style="color:#555;font-size:12px;">${escapeHtml(it.notes)}</span>` : "";
      const optLine = opts ? `<br/><span style="color:#555;font-size:12px;">${opts}</span>` : "";
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #333;vertical-align:top;">
          <strong>${escapeHtml(it.name)}</strong> × ${it.quantity}${optLine}${notes}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #333;text-align:right;">${formatCents(it.lineTotalCents)}</td>
      </tr>`;
    })
    .join("");
}

export function buildAdminNewOrderHtml(
  order: OrderPayloadForConfirmation,
  ctx: AdminNewOrderCtx,
  contact: AdminOrderContact | null
): string {
  const name = escapeHtml(ctx.restaurantName);
  const logoBlock = ctx.logoUrl
    ? `<img src="${escapeHtml(ctx.logoUrl)}" alt="${name}" width="140" style="max-width:140px;height:auto;display:block;border:0;" />`
    : `<p style="margin:0;font-size:22px;font-weight:bold;color:#f5f5f5;">${name}</p>`;

  const contactBlock = contact
    ? `<p style="margin:0 0 12px;"><strong>Customer</strong><br/>
      ${escapeHtml(contact.name)}<br/>
      <a href="mailto:${escapeHtml(contact.email)}" style="color:#ffb454;">${escapeHtml(contact.email)}</a><br/>
      ${contact.phone ? escapeHtml(contact.phone) : "—"}
    </p>`
    : `<p style="margin:0 0 12px;color:#ffb454;">Customer contact not available — check Stripe customer email.</p>`;

  const addr = (ctx.addressLines ?? []).map((l) => escapeHtml(l)).join("<br/>");
  const notes = order.customerNotes?.trim()
    ? `<p style="margin:12px 0;padding:12px;background:#2a2a2a;border-radius:8px;"><strong>Customer notes</strong><br/>${escapeHtml(
        order.customerNotes.trim()
      )}</p>`
    : "";

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#1a1a1a;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#eaeaea;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:20px 10px;">
  <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:640px;background:#242424;border-radius:12px;border:1px solid #333;">
      <tr><td style="padding:20px;text-align:center;border-bottom:1px solid #333;">${logoBlock}</td></tr>
      <tr><td style="padding:20px;font-size:15px;line-height:1.5;">
        <h1 style="margin:0 0 12px;font-size:20px;color:#fff;">New paid order</h1>
        <p style="margin:0 0 8px;"><strong>Restaurant</strong> ${name}</p>
        <p style="margin:0 0 8px;"><strong>Order #</strong> ${escapeHtml(order.orderNumber)} · <strong>ID</strong> ${escapeHtml(
          order._id.toString()
        )}</p>
        <p style="margin:0 0 12px;"><strong>Total</strong> ${formatCents(order.total)}</p>
        ${contactBlock}
        <p style="margin:0 0 12px;font-size:13px;color:#bbb;">
          <strong>Stripe Checkout session</strong><br/><code style="word-break:break-all;">${escapeHtml(ctx.stripeSessionId)}</code>
        </p>
        ${
          ctx.stripePaymentIntentId
            ? `<p style="margin:0 0 12px;font-size:13px;color:#bbb;"><strong>PaymentIntent</strong><br/><code style="word-break:break-all;">${escapeHtml(
                ctx.stripePaymentIntentId
              )}</code></p>`
            : ""
        }
        ${notes}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;border-collapse:collapse;">
          <thead><tr>
            <th align="left" style="padding:8px;border-bottom:1px solid #555;font-size:11px;text-transform:uppercase;color:#aaa;">Item</th>
            <th align="right" style="padding:8px;border-bottom:1px solid #555;font-size:11px;text-transform:uppercase;color:#aaa;">Line</th>
          </tr></thead>
          <tbody>${lineRowsHtml(order)}</tbody>
        </table>
        <table role="presentation" width="100%" style="margin-top:16px;font-size:14px;">
          <tr><td>Subtotal</td><td align="right">${formatCents(order.subtotal)}</td></tr>
          <tr><td>Tax</td><td align="right">${formatCents(order.tax)}</td></tr>
          ${order.tip ? `<tr><td>Tip</td><td align="right">${formatCents(order.tip)}</td></tr>` : ""}
          <tr><td style="padding-top:8px;font-weight:bold;color:#ffb454;">Total</td><td align="right" style="padding-top:8px;font-weight:bold;color:#ffb454;">${formatCents(
            order.total
          )}</td></tr>
        </table>
        ${addr ? `<p style="margin:16px 0 0;font-size:12px;color:#888;">${addr}</p>` : ""}
      </td></tr>
      <tr><td style="padding:14px 20px;font-size:11px;color:#777;border-top:1px solid #333;">
        Automated message from ${name} — kitchen / operations.
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}
