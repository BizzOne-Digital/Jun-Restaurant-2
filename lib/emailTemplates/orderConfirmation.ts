import { formatCents } from "@/lib/utils";
import { formatPickupPrepareWindow } from "@/lib/email/constants";
import { escapeHtml } from "@/lib/email/escape-html";

export type OrderLineForEmail = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  notes?: string;
  selectedOptions?: { name: string; value: string }[];
};

export type OrderPayloadForConfirmation = {
  _id: { toString(): string };
  orderNumber: string;
  fulfillmentType: "pickup" | "delivery";
  pickupType?: string | null;
  pickupTime?: string;
  subtotal: number;
  tax: number;
  deliveryFee?: number;
  tip?: number;
  total: number;
  paymentStatus: string;
  items: OrderLineForEmail[];
  customerNotes?: string;
  deliveryAddress?: { line1: string; line2?: string; city: string; state: string; zip: string } | null;
};

export type OrderConfirmationCtx = {
  siteOrigin: string;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  restaurantName: string;
  logoUrl?: string | null;
  pickupPrepareMinutes?: number;
  addressLines?: string[];
};

export function buildOrderConfirmationSubject(restaurantName: string): string {
  return `Order confirmation — ${restaurantName}`;
}

function paymentRef(ctx: OrderConfirmationCtx): string {
  if (ctx.stripePaymentIntentId) return ctx.stripePaymentIntentId;
  if (ctx.stripeSessionId) return ctx.stripeSessionId;
  return "—";
}

function servingLabel(order: OrderPayloadForConfirmation): string {
  return order.fulfillmentType === "delivery" ? "Delivery" : "Pickup";
}

function pickupEstimate(order: OrderPayloadForConfirmation, ctx: OrderConfirmationCtx): string {
  const mins = ctx.pickupPrepareMinutes ?? 20;
  const base = formatPickupPrepareWindow(mins);
  if (order.pickupType === "SCHEDULED" && order.pickupTime?.trim()) {
    return `Scheduled for ${order.pickupTime.trim()}`;
  }
  if (order.pickupType === "ASAP" || !order.pickupTime?.trim()) {
    return `ASAP — ${base}`;
  }
  // Legacy: pickupTime set but no pickupType
  return `${base} — requested ${order.pickupTime.trim()}`;
}

function lineRowsHtml(order: OrderPayloadForConfirmation): string {
  return order.items
    .map((it) => {
      const opts =
        it.selectedOptions?.map((o) => `${escapeHtml(o.name)}: ${escapeHtml(o.value)}`).join(" · ") ?? "";
      const notes = it.notes?.trim() ? `<br/><span style="color:#666;font-size:12px;">${escapeHtml(it.notes)}</span>` : "";
      const optLine = opts ? `<br/><span style="color:#666;font-size:12px;">${opts}</span>` : "";
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top;">
          <strong>${escapeHtml(it.name)}</strong> × ${it.quantity}${optLine}${notes}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${formatCents(it.lineTotalCents)}</td>
      </tr>`;
    })
    .join("");
}

function lineRowsText(order: OrderPayloadForConfirmation): string {
  return order.items
    .map((it) => {
      const opts = it.selectedOptions?.map((o) => `${o.name}: ${o.value}`).join(", ") ?? "";
      const bits = [`${it.name} × ${it.quantity}`, formatCents(it.lineTotalCents)];
      if (opts) bits.push(`(${opts})`);
      if (it.notes?.trim()) bits.push(`Notes: ${it.notes}`);
      return bits.join(" — ");
    })
    .join("\n");
}

export function buildOrderConfirmationHtml(order: OrderPayloadForConfirmation, ctx: OrderConfirmationCtx): string {
  const name = escapeHtml(ctx.restaurantName);
  const logoBlock = ctx.logoUrl
    ? `<img src="${escapeHtml(ctx.logoUrl)}" alt="${name}" width="140" style="max-width:140px;height:auto;display:block;border:0;" />`
    : `<p style="margin:0;font-size:22px;font-weight:bold;color:#111;">${name}</p>`;

  const addr = (ctx.addressLines ?? []).map((l) => escapeHtml(l)).join("<br/>");

  const deliveryBlock =
    order.fulfillmentType === "delivery" && order.deliveryAddress
      ? `<p style="margin:12px 0 0;font-size:14px;"><strong>Delivery address</strong><br/>${escapeHtml(order.deliveryAddress.line1)}${
          order.deliveryAddress.line2 ? `<br/>${escapeHtml(order.deliveryAddress.line2)}` : ""
        }<br/>${escapeHtml(order.deliveryAddress.city)}, ${escapeHtml(order.deliveryAddress.state)} ${escapeHtml(order.deliveryAddress.zip)}</p>`
      : "";

  const notesBlock = order.customerNotes?.trim()
    ? `<p style="margin:16px 0 0;padding:12px;background:#f7f7f7;border-radius:8px;font-size:14px;"><strong>Your notes</strong><br/>${escapeHtml(
        order.customerNotes.trim()
      )}</p>`
    : "";

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f4;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f4;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
      <tr><td style="padding:24px 24px 8px;text-align:center;">${logoBlock}</td></tr>
      <tr><td style="padding:8px 24px 0;text-align:center;">
        <h1 style="margin:0;font-size:20px;color:#111;">Thank you for your order</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#444;">${name}</p>
      </td></tr>
      <tr><td style="padding:20px 24px;font-size:14px;color:#333;line-height:1.5;">
        <p style="margin:0 0 12px;"><strong>Order number</strong> ${escapeHtml(order.orderNumber)}<br/>
        <strong>Order ID</strong> ${escapeHtml(order._id.toString())}</p>
        <p style="margin:0 0 12px;"><strong>Serving</strong> ${servingLabel(order)}<br/>
        <strong>Estimated ready window</strong> ${escapeHtml(pickupEstimate(order, ctx))}</p>
        <p style="margin:0 0 12px;"><strong>Payment</strong> ${escapeHtml(order.paymentStatus)} · <strong>Reference</strong> ${escapeHtml(
          paymentRef(ctx)
        )}</p>
        ${deliveryBlock}
        ${notesBlock}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;border-collapse:collapse;">
          <thead><tr>
            <th align="left" style="padding:8px;border-bottom:2px solid #ddd;font-size:12px;text-transform:uppercase;color:#666;">Item</th>
            <th align="right" style="padding:8px;border-bottom:2px solid #ddd;font-size:12px;text-transform:uppercase;color:#666;">Line</th>
          </tr></thead>
          <tbody>${lineRowsHtml(order)}</tbody>
        </table>
        <table role="presentation" width="100%" style="margin-top:16px;font-size:14px;">
          <tr><td>Subtotal</td><td align="right">${formatCents(order.subtotal)}</td></tr>
          <tr><td>Tax</td><td align="right">${formatCents(order.tax)}</td></tr>
          ${order.deliveryFee ? `<tr><td>Delivery</td><td align="right">${formatCents(order.deliveryFee)}</td></tr>` : ""}
          ${order.tip ? `<tr><td>Tip</td><td align="right">${formatCents(order.tip)}</td></tr>` : ""}
          <tr><td style="padding-top:8px;font-weight:bold;">Total</td><td align="right" style="padding-top:8px;font-weight:bold;">${formatCents(
            order.total
          )}</td></tr>
        </table>
        ${addr ? `<p style="margin:20px 0 0;font-size:13px;color:#666;">${addr}</p>` : ""}
      </td></tr>
      <tr><td style="padding:16px 24px 24px;font-size:12px;color:#888;border-top:1px solid #eee;">
        This is an automated message from ${name}.
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

export function buildOrderConfirmationText(order: OrderPayloadForConfirmation, ctx: OrderConfirmationCtx): string {
  const lines: string[] = [
    `Thank you — ${ctx.restaurantName}`,
    "",
    `Order number: ${order.orderNumber}`,
    `Order ID: ${order._id.toString()}`,
    `Serving: ${servingLabel(order)}`,
    `Estimated ready window: ${pickupEstimate(order, ctx)}`,
    `Payment: ${order.paymentStatus}`,
    `Reference: ${paymentRef(ctx)}`,
    "",
    "Items:",
    lineRowsText(order),
    "",
    `Subtotal: ${formatCents(order.subtotal)}`,
    `Tax: ${formatCents(order.tax)}`,
  ];
  if (order.deliveryFee) lines.push(`Delivery: ${formatCents(order.deliveryFee)}`);
  if (order.tip) lines.push(`Tip: ${formatCents(order.tip)}`);
  lines.push(`Total: ${formatCents(order.total)}`);
  if (order.customerNotes?.trim()) lines.push("", "Your notes:", order.customerNotes.trim());
  if (order.fulfillmentType === "delivery" && order.deliveryAddress) {
    const a = order.deliveryAddress;
    lines.push("", "Delivery address:", `${a.line1}${a.line2 ? `, ${a.line2}` : ""}`, `${a.city}, ${a.state} ${a.zip}`);
  }
  if (ctx.addressLines?.length) {
    lines.push("", ...ctx.addressLines);
  }
  lines.push("", `This is an automated message from ${ctx.restaurantName}.`);
  return lines.join("\n");
}
