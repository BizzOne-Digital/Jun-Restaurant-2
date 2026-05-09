import type { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { isMailgunConfigured, sendMailgunEmail } from "@/lib/mailgun";
import { loadRestaurantEmailContext } from "@/lib/email/restaurant-context";
import { resolveOrderCustomerContact } from "@/lib/email/order-contact";
import { isLegacyEmailConfigured, sendLegacyTransactional } from "@/lib/email/legacy-send";
import {
  buildOrderStatusHtml,
  buildOrderStatusSubject,
  buildOrderStatusText,
  type StatusNotifyKind,
} from "@/lib/emailTemplates/orderStatusUpdate";

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function anyOutboundConfigured(): boolean {
  return isMailgunConfigured() || isLegacyEmailConfigured();
}

export type OrderForStatusEmail = {
  _id: Types.ObjectId;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  statusEmailLog?: { status: string; sentAt?: Date; recipient?: string }[];
  guestInfo?: { name: string; email: string; phone: string } | null;
  customer?: Types.ObjectId | null;
};

/**
 * Sends completed/cancelled notifications to the customer. Never throws.
 */
export async function sendOrderStatusEmailIfNeeded(
  order: OrderForStatusEmail,
  previousStatus: string
): Promise<void> {
  if (previousStatus === order.orderStatus) return;
  if (order.orderStatus !== "completed" && order.orderStatus !== "cancelled") return;
  if (order.orderStatus === "completed" && order.paymentStatus !== "paid") return;
  if (!anyOutboundConfigured()) return;

  try {
    await connectDB();
    const fresh = (await Order.findById(order._id).lean()) as OrderForStatusEmail | null;
    if (!fresh) return;

    const already = fresh.statusEmailLog?.some((e) => e.status === fresh.orderStatus);
    if (already) return;

    const origin = siteOrigin();
    const ctx = await loadRestaurantEmailContext(origin);
    const contact = await resolveOrderCustomerContact(fresh);
    if (!contact?.email) return;

    const kind = fresh.orderStatus as StatusNotifyKind;
    const statusCtx = {
      restaurantName: ctx.restaurantName,
      logoUrl: ctx.logoUrl,
      addressLines: ctx.addressLines,
      orderNumber: fresh.orderNumber,
      orderId: fresh._id.toString(),
    };

    const html = buildOrderStatusHtml(kind, statusCtx);
    const text = buildOrderStatusText(kind, statusCtx);
    const subject = buildOrderStatusSubject(ctx.restaurantName);
    const replyTo = process.env.RESTAURANT_ORDER_EMAIL?.trim() || ctx.email || undefined;

    if (isMailgunConfigured()) {
      await sendMailgunEmail({
        to: contact.email,
        subject,
        html,
        text,
        replyTo,
        restaurantDisplayName: ctx.restaurantName,
      });
    } else if (isLegacyEmailConfigured()) {
      await sendLegacyTransactional({
        to: contact.email,
        subject,
        html,
        text,
        replyTo,
      });
    } else {
      return;
    }

    await Order.updateOne(
      { _id: fresh._id },
      {
        $push: {
          statusEmailLog: {
            status: fresh.orderStatus,
            sentAt: new Date(),
            recipient: contact.email,
          },
        },
      }
    );
  } catch (e) {
    console.error("[email] sendOrderStatusEmailIfNeeded", e);
  }
}
