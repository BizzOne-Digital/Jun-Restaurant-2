import type Stripe from "stripe";
import { connectDB } from "@/lib/mongodb";
import { getStripe } from "@/lib/stripe";
import { recomputePopularItems } from "@/lib/recompute-popular";
import { MenuItem } from "@/models/MenuItem";
import { Order } from "@/models/Order";
import { PayoutLedger } from "@/models/PayoutLedger";
import { sendPaidOrderEmails } from "@/lib/email/send-order-emails";
import { traceOrderEmail } from "@/lib/email/order-email-trace";
import { calculatePlatformFee, calculateRestaurantPayout } from "@/lib/payment-config";

/** Legacy rows may still use platform_collect; new checkouts always use Connect split (see lib/payment-config.ts). */
function ledgerForPaidOrder(order: {
  total: number;
  paymentMode: string;
  commissionAmount: number;
  restaurantPayoutAmount: number;
}): {
  commissionAmount: number;
  restaurantPayoutAmount: number;
  scenario: "instant_connect_split" | "platform_collect_then_later_payout";
  ledgerStatus: "transferred" | "pending";
} {
  if (order.paymentMode === "platform_collect") {
    return {
      commissionAmount: order.commissionAmount,
      restaurantPayoutAmount: order.restaurantPayoutAmount,
      scenario: "platform_collect_then_later_payout",
      ledgerStatus: "pending",
    };
  }
  // Stripe split settings are intentionally hardcoded server-side so restaurant/admin users
  // cannot modify commission or destination account from the admin portal.
  return {
    commissionAmount: calculatePlatformFee(order.total),
    restaurantPayoutAmount: calculateRestaurantPayout(order.total),
    scenario: "instant_connect_split",
    ledgerStatus: "transferred",
  };
}

export type CheckoutSyncResult = {
  ok: boolean;
  paymentStatus?: string;
  orderNumber?: string;
  /** Stripe session payment_status when order row not yet paid */
  stripePaymentStatus?: string;
  error?: string;
};

async function retrieveCheckoutSession(
  stripe: ReturnType<typeof getStripe>,
  sessionId: string
): Promise<Stripe.Checkout.Session | null> {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  } catch (e) {
    console.error("[stripe] checkout.sessions.retrieve failed", sessionId, e);
    return null;
  }
}

function paymentIntentId(session: Stripe.Checkout.Session): string {
  const pi = session.payment_intent;
  if (typeof pi === "string") return pi;
  return pi?.id ?? "";
}

/**
 * Marks order paid (once), updates ledger & popularity, sends emails — same as webhook path.
 * Call with Checkout Session id or hydrated Session from webhook.
 */
export async function syncPaidOrderFromStripeCheckout(
  sessionOrId: string | Stripe.Checkout.Session
): Promise<CheckoutSyncResult> {
  await connectDB();
  const stripe = getStripe();
  const session =
    typeof sessionOrId === "string"
      ? await retrieveCheckoutSession(stripe, sessionOrId)
      : sessionOrId;

  if (!session || !session.id) {
    return { ok: false, error: "session_not_found" };
  }

  const sessionId = session.id;
  const orderId = session.metadata?.orderId ?? session.client_reference_id;
  if (!orderId) {
    console.warn("[stripe] checkout session missing orderId metadata", sessionId);
    return { ok: false, error: "missing_order_metadata" };
  }

  let order = await Order.findById(orderId);
  if (!order) {
    order = await Order.findOne({ stripeCheckoutSessionId: sessionId });
  }
  if (!order) {
    console.warn("[stripe] order not found for checkout", sessionId, orderId);
    return { ok: false, error: "order_not_found" };
  }

  traceOrderEmail("stripe_sync:checkout_session_resolved", {
    source: typeof sessionOrId === "string" ? "session_id_string" : "session_object",
    sessionId,
    orderIdFromStripe: orderId,
    stripePaymentStatus: session.payment_status,
    dbPaymentStatus: order.paymentStatus,
    orderNumber: order.orderNumber,
  });

  const pi = paymentIntentId(session);

  if (!order.stripeCheckoutSessionId) {
    order.stripeCheckoutSessionId = sessionId;
    await order.save();
  }

  const stripePaid = session.payment_status === "paid";

  if (order.paymentStatus === "paid") {
    try {
      traceOrderEmail("stripe_sync:invoke_sendPaidOrderEmails", {
        path: "db_already_paid",
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        sessionId,
      });
      await sendPaidOrderEmails(order._id.toString(), {
        stripeSessionId: sessionId,
        stripePaymentIntentId: pi || order.stripePaymentIntentId || undefined,
      });
    } catch (e) {
      console.error("[email] sendPaidOrderEmails (already-paid path)", e);
    }
    return {
      ok: true,
      paymentStatus: "paid",
      orderNumber: order.orderNumber,
      stripePaymentStatus: session.payment_status ?? undefined,
    };
  }

  if (!stripePaid) {
    console.info(
      "[stripe] checkout session not paid yet",
      sessionId,
      "stripe_payment_status=",
      session.payment_status,
      "db_payment=",
      order.paymentStatus
    );
    return {
      ok: true,
      paymentStatus: order.paymentStatus,
      orderNumber: order.orderNumber,
      stripePaymentStatus: session.payment_status ?? undefined,
    };
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: "pending" },
    {
      $set: {
        paymentStatus: "paid",
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: pi || order.stripePaymentIntentId,
      },
    },
    { new: true }
  );

  if (!updated) {
    const again = await Order.findById(order._id);
    if (again?.paymentStatus === "paid") {
      try {
        traceOrderEmail("stripe_sync:invoke_sendPaidOrderEmails", {
          path: "race_first_update_lost_already_paid",
          orderId: again._id.toString(),
          orderNumber: again.orderNumber,
          sessionId,
        });
        await sendPaidOrderEmails(again._id.toString(), {
          stripeSessionId: sessionId,
          stripePaymentIntentId: pi || again.stripePaymentIntentId || undefined,
        });
      } catch (e) {
        console.error("[email] sendPaidOrderEmails (race already-paid)", e);
      }
      return {
        ok: true,
        paymentStatus: "paid",
        orderNumber: again.orderNumber,
        stripePaymentStatus: session.payment_status ?? undefined,
      };
    }
    return {
      ok: true,
      paymentStatus: again?.paymentStatus ?? "unknown",
      orderNumber: again?.orderNumber,
      stripePaymentStatus: session.payment_status ?? undefined,
    };
  }

  console.info("[stripe] order marked paid", updated.orderNumber, sessionId);

  for (const line of updated.items) {
    await MenuItem.updateOne({ _id: line.menuItem }, { $inc: { purchaseCount: line.quantity } });
  }
  await recomputePopularItems();

  const ledger = ledgerForPaidOrder(updated);

  await PayoutLedger.updateOne(
    { order: updated._id },
    {
      $set: {
        restaurant: updated.restaurant,
        order: updated._id,
        totalCollected: updated.total,
        commissionAmount: ledger.commissionAmount,
        restaurantPayoutAmount: ledger.restaurantPayoutAmount,
        status: ledger.ledgerStatus,
        stripeTransferId: "",
        payoutScenario: ledger.scenario,
      },
    },
    { upsert: true }
  );

  try {
    traceOrderEmail("stripe_sync:invoke_sendPaidOrderEmails", {
      path: "first_transition_pending_to_paid",
      orderId: updated._id.toString(),
      orderNumber: updated.orderNumber,
      sessionId,
    });
    await sendPaidOrderEmails(updated._id.toString(), {
      stripeSessionId: sessionId,
      stripePaymentIntentId: pi || undefined,
    });
  } catch (e) {
    console.error("[email] sendPaidOrderEmails from checkout sync", e);
  }

  return {
    ok: true,
    paymentStatus: "paid",
    orderNumber: updated.orderNumber,
    stripePaymentStatus: session.payment_status ?? undefined,
  };
}

/**
 * Fallback when only PaymentIntent webhooks fire (metadata must include orderId from Checkout).
 */
export async function syncPaidOrderFromPaymentIntent(pi: Stripe.PaymentIntent): Promise<void> {
  const orderId = pi.metadata?.orderId;
  if (!orderId) {
    console.info("[stripe] payment_intent.succeeded without orderId metadata — skipping", pi.id);
    return;
  }

  await connectDB();
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: "pending" },
    {
      $set: {
        paymentStatus: "paid",
        stripePaymentIntentId: pi.id,
      },
    },
    { new: true }
  );

  if (!updated) {
    console.info("[stripe] payment_intent.succeeded noop (already paid or missing)", pi.id, orderId);
    return;
  }

  console.info("[stripe] order marked paid via PaymentIntent", updated.orderNumber, pi.id);

  for (const line of updated.items) {
    await MenuItem.updateOne({ _id: line.menuItem }, { $inc: { purchaseCount: line.quantity } });
  }
  await recomputePopularItems();

  const ledger = ledgerForPaidOrder(updated);

  await PayoutLedger.updateOne(
    { order: updated._id },
    {
      $set: {
        restaurant: updated.restaurant,
        order: updated._id,
        totalCollected: updated.total,
        commissionAmount: ledger.commissionAmount,
        restaurantPayoutAmount: ledger.restaurantPayoutAmount,
        status: ledger.ledgerStatus,
        stripeTransferId: "",
        payoutScenario: ledger.scenario,
      },
    },
    { upsert: true }
  );

  const sessionId = updated.stripeCheckoutSessionId || "";
  try {
    traceOrderEmail("stripe_sync:invoke_sendPaidOrderEmails", {
      path: "payment_intent_succeeded",
      orderId: updated._id.toString(),
      orderNumber: updated.orderNumber,
      paymentIntentId: pi.id,
      checkoutSessionIdOrEmpty: sessionId || "(none)",
    });
    await sendPaidOrderEmails(updated._id.toString(), {
      stripeSessionId: sessionId || "unknown",
      stripePaymentIntentId: pi.id,
    });
  } catch (e) {
    console.error("[email] sendPaidOrderEmails from PI sync", e);
  }
}
