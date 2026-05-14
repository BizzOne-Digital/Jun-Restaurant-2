import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AWOK_STRIPE_CONNECTED_ACCOUNT_ID } from "@/lib/payment-config";
import { Order } from "@/models/Order";
import { syncPaidOrderFromStripeCheckoutDirect } from "@/lib/stripe-order-payment-sync";
import { traceOrderEmail } from "@/lib/email/order-email-trace";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }
  traceOrderEmail("orders/lookup:requested", { sessionIdPrefix: sessionId.slice(0, 14) });
  try {
    await connectDB();
    let order = await Order.findOne({ stripeCheckoutSessionId: sessionId }).lean();
    if (!order) {
      console.info("[orders/lookup] no order row yet for session", sessionId.slice(0, 20) + "…");
      return NextResponse.json({ found: false });
    }

    if (order.paymentStatus !== "paid" && !process.env.STRIPE_SECRET_KEY) {
      traceOrderEmail("orders/lookup:pending_but_no_stripe_secret", {
        orderNumber: order.orderNumber,
        orderId: String(order._id),
        sessionIdPrefix: sessionId.slice(0, 14),
        hint: "Set STRIPE_SECRET_KEY on this deployment so the success page can sync payment and send confirmation email (no webhook required)",
      });
    }

    if (order.paymentStatus !== "paid" && process.env.STRIPE_SECRET_KEY) {
      traceOrderEmail("orders/lookup:sync_start", {
        orderNumber: order.orderNumber,
        orderId: String(order._id),
        sessionIdPrefix: sessionId.slice(0, 14),
      });
      console.info("[orders/lookup] payment still pending — syncing with Stripe", order.orderNumber);
      // Sessions are created on the connected account (direct charge), so we must pass
      // the stripeAccount context when retrieving by session ID.
      const sync = await syncPaidOrderFromStripeCheckoutDirect(sessionId, AWOK_STRIPE_CONNECTED_ACCOUNT_ID);
      if (!sync.ok) {
        console.warn("[orders/lookup] Stripe sync incomplete", sync.error);
      } else if (sync.paymentStatus === "paid") {
        console.info("[orders/lookup] payment confirmed via Stripe sync", order.orderNumber);
      }
      order = (await Order.findOne({ stripeCheckoutSessionId: sessionId }).lean()) ?? order;
    }

    return NextResponse.json({
      found: true,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      fulfillmentType: order.fulfillmentType,
      total: order.total,
    });
  } catch (e) {
    console.error("[orders/lookup]", e);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
