import { NextResponse } from "next/server";
import Stripe from "stripe";
import { connectDB } from "@/lib/mongodb";
import { getStripe } from "@/lib/stripe";
import { recomputePopularItems } from "@/lib/recompute-popular";
import { MenuItem } from "@/models/MenuItem";
import { Order } from "@/models/Order";
import { PayoutLedger } from "@/models/PayoutLedger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId ?? session.client_reference_id;
    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    try {
      await connectDB();
      const order = await Order.findById(orderId);
      if (!order) {
        console.error("Order not found for webhook", orderId);
        return NextResponse.json({ received: true });
      }
      if (order.paymentStatus === "paid") {
        return NextResponse.json({ received: true });
      }

      const pi =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? "";

      order.paymentStatus = "paid";
      order.stripeCheckoutSessionId = session.id;
      order.stripePaymentIntentId = pi;
      await order.save();

      for (const line of order.items) {
        await MenuItem.updateOne({ _id: line.menuItem }, { $inc: { purchaseCount: line.quantity } });
      }
      await recomputePopularItems();

      const scenario =
        order.paymentMode === "stripe_connect_split"
          ? "instant_connect_split"
          : "platform_collect_then_later_payout";

      const ledgerStatus = order.paymentMode === "stripe_connect_split" ? "transferred" : "pending";

      await PayoutLedger.updateOne(
        { order: order._id },
        {
          $set: {
            restaurant: order.restaurant,
            order: order._id,
            totalCollected: order.total,
            commissionAmount: order.commissionAmount,
            restaurantPayoutAmount: order.restaurantPayoutAmount,
            status: ledgerStatus,
            stripeTransferId: "",
            payoutScenario: scenario,
          },
        },
        { upsert: true }
      );
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
