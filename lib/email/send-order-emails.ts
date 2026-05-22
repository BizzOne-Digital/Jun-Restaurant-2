import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { formatCents } from "@/lib/utils";
import { isMailgunConfigured, sendMailgunEmail } from "@/lib/mailgun";
import { Order } from "@/models/Order";
import { loadRestaurantEmailContext } from "@/lib/email/restaurant-context";
import { resolveOrderCustomerContact } from "@/lib/email/order-contact";
import { htmlToPlainText } from "@/lib/email/html-to-text";
import { isLegacyEmailConfigured, sendLegacyTransactional } from "@/lib/email/legacy-send";
import {
  buildOrderConfirmationHtml,
  buildOrderConfirmationSubject,
  buildOrderConfirmationText,
  type OrderConfirmationCtx,
  type OrderPayloadForConfirmation,
} from "@/lib/emailTemplates/orderConfirmation";
import {
  buildAdminNewOrderHtml,
  buildAdminNewOrderSubject,
} from "@/lib/emailTemplates/adminNewOrder";
import { traceOrderEmail } from "@/lib/email/order-email-trace";

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function isEmailConfigured(): boolean {
  return isMailgunConfigured() || isLegacyEmailConfigured();
}

type OrderLean = OrderPayloadForConfirmation & {
  _id: Types.ObjectId;
  guestInfo?: { name: string; email: string; phone: string } | null;
  customer?: Types.ObjectId | null;
  paymentStatus: string;
  merchantNotificationEmailSent?: boolean;
  confirmationEmailSent?: boolean;
  restaurantOrderEmailSent?: boolean;
  restaurantOrderEmailSentAt?: Date | null;
  customerOrderConfirmationSentAt?: Date | null;
  confirmationEmailStatus?: string;
};

async function migrateLegacyEmailFlags(orderId: string): Promise<void> {
  const o = await Order.findById(orderId).lean();
  if (!o) return;
  const $set: Record<string, unknown> = {};
  const rec = o as Record<string, unknown>;
  if (rec.customerOrderConfirmationSentAt && !rec.confirmationEmailSent) {
    $set.confirmationEmailSent = true;
    $set.confirmationEmailStatus = "sent";
    $set.confirmationEmailSentAt = rec.customerOrderConfirmationSentAt;
  }
  if ((rec.restaurantOrderEmailSent || rec.restaurantOrderEmailSentAt) && !rec.merchantNotificationEmailSent) {
    $set.merchantNotificationEmailSent = true;
    $set.merchantNotificationEmailSentAt =
      rec.restaurantOrderEmailSentAt ?? rec.merchantNotificationEmailSentAt ?? new Date();
  }
  if (Object.keys($set).length) {
    await Order.updateOne({ _id: new mongoose.Types.ObjectId(orderId) }, { $set });
  }
}

function splitEnvList(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t || undefined;
}

/**
 * Sends kitchen + customer transactional emails after payment is verified.
 * Never throws — logs errors for webhook safety.
 */
export async function sendPaidOrderEmails(
  orderRef: string | { _id: Types.ObjectId | string },
  opts: { stripeSessionId: string; stripePaymentIntentId?: string }
): Promise<void> {
  try {
    await connectDB();
    const id = typeof orderRef === "string" ? orderRef : String(orderRef._id);
    await migrateLegacyEmailFlags(id);

    let order = (await Order.findById(id).lean()) as OrderLean | null;
    if (!order) {
      console.error("[email] sendPaidOrderEmails: order not found", id);
      return;
    }

    const oid = order._id;

    traceOrderEmail("sendPaidOrderEmails:entry", {
      orderId: id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      merchantNotificationEmailSent: order.merchantNotificationEmailSent,
      confirmationEmailSent: order.confirmationEmailSent,
      confirmationEmailStatus: order.confirmationEmailStatus,
      isMailgunConfigured: isMailgunConfigured(),
      isLegacyEmailConfigured: isLegacyEmailConfigured(),
      hasGuestEmail: Boolean(order.guestInfo?.email),
      hasCustomerRef: Boolean(order.customer),
    });

    if (order.merchantNotificationEmailSent && order.confirmationEmailSent) {
      traceOrderEmail("sendPaidOrderEmails:exit", {
        reason: "both_merchant_and_confirmation_already_sent",
        orderId: id,
      });
      return;
    }

    if (!isMailgunConfigured() && !isLegacyEmailConfigured()) {
      console.warn("[email] No Mailgun / Resend / SMTP configured — skipping order emails");
      traceOrderEmail("sendPaidOrderEmails:exit", {
        reason: "no_email_provider_configured",
        orderId: id,
        hint: "AWOK needs MAILGUN_API_KEY+MAILGUN_DOMAIN+(MAILGUN_FROM or MAILGUN_FROM_EMAIL), or legacy Resend/SMTP",
      });
      return;
    }

    const origin = siteOrigin();
    const ctx = await loadRestaurantEmailContext(origin);

    traceOrderEmail("sendPaidOrderEmails:context", {
      orderId: id,
      restaurantName: ctx.restaurantName,
      restaurantSlugFromEnv: process.env.RESTAURANT_SLUG?.trim() || "(default a-wok in loadRestaurantEmailContext)",
      kitchenToFromEnv: Boolean(splitEnvList(process.env.RESTAURANT_ORDER_EMAIL)),
      kitchenToFromSiteSetting: Boolean(ctx.email),
    });

    const kitchenTo = splitEnvList(process.env.RESTAURANT_ORDER_EMAIL) || ctx.email;
    if (!kitchenTo) {
      console.error(
        "[email] Kitchen inbox missing: set RESTAURANT_ORDER_EMAIL or SiteSetting.email (admin → order & email)."
      );
    }

    const orderPayload: OrderPayloadForConfirmation = {
      _id: order._id,
      orderNumber: order.orderNumber,
      fulfillmentType: order.fulfillmentType,
      pickupType: (order as unknown as { pickupType?: string | null }).pickupType ?? null,
      pickupTime: order.pickupTime,
      subtotal: order.subtotal,
      tax: order.tax,
      deliveryFee: order.deliveryFee,
      tip: order.tip,
      total: order.total,
      paymentStatus: order.paymentStatus,
      items: order.items,
      customerNotes: order.customerNotes,
      deliveryAddress: order.deliveryAddress ?? null,
    };

    const templateCtx: OrderConfirmationCtx = {
      siteOrigin: origin,
      stripePaymentIntentId: opts.stripePaymentIntentId,
      stripeSessionId: opts.stripeSessionId,
      restaurantName: ctx.restaurantName,
      logoUrl: ctx.logoUrl,
      pickupPrepareMinutes: ctx.pickupPrepareMinutes,
      addressLines: ctx.addressLines,
    };

    const contact = await resolveOrderCustomerContact(order);
    const cc = splitEnvList(process.env.ORDER_CC_EMAIL);
    const bcc = splitEnvList(process.env.ADMIN_ORDER_EMAIL);

    const sendKitchenMailgun = async () => {
      if (!kitchenTo) return;
      const html = buildAdminNewOrderHtml(
        orderPayload,
        {
          siteOrigin: origin,
          stripeSessionId: opts.stripeSessionId,
          stripePaymentIntentId: opts.stripePaymentIntentId,
          restaurantName: ctx.restaurantName,
          logoUrl: ctx.logoUrl,
          addressLines: ctx.addressLines,
        },
        contact
      );
      const subject = buildAdminNewOrderSubject(orderPayload.orderNumber, orderPayload.total, ctx.restaurantName);
      await sendMailgunEmail({
        to: kitchenTo,
        subject,
        html,
        text: htmlToPlainText(html),
        cc,
        bcc,
        replyTo: contact?.email,
        restaurantDisplayName: ctx.restaurantName,
      });
      const now = new Date();
      await Order.updateOne(
        { _id: oid, merchantNotificationEmailSent: { $ne: true } },
        {
          $set: {
            merchantNotificationEmailSent: true,
            merchantNotificationEmailSentAt: now,
            restaurantOrderEmailSent: true,
            restaurantOrderEmailSentAt: now,
          },
        }
      );
    };

    const sendKitchenLegacy = async () => {
      if (!kitchenTo) return;
      const subject = `[New order] ${ctx.restaurantName} ${orderPayload.orderNumber} — ${formatCents(orderPayload.total)} paid`;
      const html = buildAdminNewOrderHtml(
        orderPayload,
        {
          siteOrigin: origin,
          stripeSessionId: opts.stripeSessionId,
          stripePaymentIntentId: opts.stripePaymentIntentId,
          restaurantName: ctx.restaurantName,
          logoUrl: ctx.logoUrl,
          addressLines: ctx.addressLines,
        },
        contact
      );
      await sendLegacyTransactional({
        to: kitchenTo,
        subject,
        html,
        text: htmlToPlainText(html),
        cc,
        bcc,
        replyTo: contact?.email,
      });
      const now = new Date();
      await Order.updateOne(
        { _id: oid, merchantNotificationEmailSent: { $ne: true } },
        {
          $set: {
            merchantNotificationEmailSent: true,
            merchantNotificationEmailSentAt: now,
            restaurantOrderEmailSent: true,
            restaurantOrderEmailSentAt: now,
          },
        }
      );
    };

    if (!order.merchantNotificationEmailSent) {
      try {
        if (isMailgunConfigured()) {
          await sendKitchenMailgun();
        } else if (isLegacyEmailConfigured()) {
          await sendKitchenLegacy();
        }
      } catch (e) {
        console.error("[email] Kitchen notification failed (customer email will still be attempted)", e);
      }
    }

    order = (await Order.findById(id).lean()) as OrderLean | null;
    if (!order) return;

    const skipCustomer = process.env.ORDER_SEND_CUSTOMER_CONFIRMATION?.trim().toLowerCase() === "false";

    if (skipCustomer && !order.confirmationEmailSent) {
      traceOrderEmail("sendPaidOrderEmails:exit", { reason: "ORDER_SEND_CUSTOMER_CONFIRMATION_false", orderId: id });
      await Order.updateOne(
        { _id: oid, confirmationEmailSent: { $ne: true } },
        {
          $set: {
            confirmationEmailSent: true,
            confirmationEmailStatus: "skipped",
            confirmationEmailSentAt: new Date(),
          },
        }
      );
      return;
    }

    if (order.confirmationEmailSent) {
      traceOrderEmail("sendPaidOrderEmails:exit", { reason: "confirmationEmailSent_already_true", orderId: id });
      return;
    }

    const cust = await resolveOrderCustomerContact(order);
    if (!cust?.email) {
      traceOrderEmail("sendPaidOrderEmails:exit", { reason: "no_customer_email_on_order", orderId: id });
      console.error("[email] No customer email on order; skipping confirmation", id);
      await Order.updateOne(
        { _id: oid, confirmationEmailSent: { $ne: true } },
        {
          $set: {
            confirmationEmailSent: true,
            confirmationEmailStatus: "failed",
            confirmationEmailError: "No customer email",
          },
        }
      );
      return;
    }

    const customerHtml = buildOrderConfirmationHtml(orderPayload, templateCtx);
    const customerText = buildOrderConfirmationText(orderPayload, templateCtx);
    const customerSubject = buildOrderConfirmationSubject(ctx.restaurantName);
    const replyCustomer = kitchenTo || ctx.email || undefined;

    try {
      if (isMailgunConfigured()) {
        traceOrderEmail("customer_confirmation:about_to_send_mailgun", {
          orderId: id,
          orderNumber: order.orderNumber,
          to: cust.email,
          subject: customerSubject,
          mailgunDomain: process.env.MAILGUN_DOMAIN?.trim(),
          fromUsesMAILGUN_FROM: Boolean(process.env.MAILGUN_FROM?.trim()),
          restaurantDisplayName: ctx.restaurantName,
        });
        await sendMailgunEmail({
          to: cust.email,
          subject: customerSubject,
          html: customerHtml,
          text: customerText,
          cc,
          replyTo: replyCustomer,
          restaurantDisplayName: ctx.restaurantName,
        });
        traceOrderEmail("customer_confirmation:mailgun_send_returned_ok", { orderId: id, to: cust.email });
      } else {
        await sendLegacyTransactional({
          to: cust.email,
          subject: `Order confirmed — ${orderPayload.orderNumber}`,
          html: customerHtml,
          text: customerText,
          cc,
          replyTo: replyCustomer,
        });
      }
      const now = new Date();
      await Order.updateOne(
        { _id: oid, confirmationEmailSent: { $ne: true } },
        {
          $set: {
            confirmationEmailSent: true,
            confirmationEmailSentAt: now,
            customerOrderConfirmationSentAt: now,
            confirmationEmailStatus: "sent",
            confirmationEmailError: "",
          },
        }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[email] Customer confirmation failed", e);
      await Order.updateOne(
        { _id: oid },
        { $set: { confirmationEmailStatus: "failed", confirmationEmailError: msg.slice(0, 2000) } }
      );
    }
  } catch (e) {
    console.error("[email] sendPaidOrderEmails fatal", e);
  }
}
