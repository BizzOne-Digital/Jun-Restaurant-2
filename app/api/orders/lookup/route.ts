import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { syncPaidOrderFromStripeCheckout } from "@/lib/stripe-order-payment-sync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }
  try {
    await connectDB();
    let order = await Order.findOne({ stripeCheckoutSessionId: sessionId }).lean();
    if (!order) {
      console.info("[orders/lookup] no order row yet for session", sessionId.slice(0, 20) + "…");
      return NextResponse.json({ found: false });
    }

    if (order.paymentStatus !== "paid" && process.env.STRIPE_SECRET_KEY) {
      console.info("[orders/lookup] payment still pending — syncing with Stripe", order.orderNumber);
      const sync = await syncPaidOrderFromStripeCheckout(sessionId);
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
