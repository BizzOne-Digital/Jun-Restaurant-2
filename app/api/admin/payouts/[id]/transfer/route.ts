import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { AWOK_STRIPE_CONNECTED_ACCOUNT_ID } from "@/lib/payment-config";
import { getStripe } from "@/lib/stripe";
import { Order } from "@/models/Order";
import { PayoutLedger } from "@/models/PayoutLedger";
import { Restaurant } from "@/models/Restaurant";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    const ledger = await PayoutLedger.findById(params.id);
    if (!ledger) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (ledger.status !== "pending") {
      return NextResponse.json({ error: "Payout is not pending" }, { status: 400 });
    }
    if (ledger.payoutScenario !== "platform_collect_then_later_payout") {
      return NextResponse.json({ error: "Transfers only apply to platform-collected orders" }, { status: 400 });
    }

    const restaurant = await Restaurant.findById(ledger.restaurant);
    const destination = (
      restaurant?.stripeConnectedAccountId?.trim() ||
      restaurant?.stripeAccountId?.trim() ||
      AWOK_STRIPE_CONNECTED_ACCOUNT_ID
    ).trim();
    if (!destination) {
      return NextResponse.json({ error: "Restaurant has no Stripe connected account" }, { status: 400 });
    }

    const stripe = getStripe();
    const transfer = await stripe.transfers.create({
      amount: ledger.restaurantPayoutAmount,
      currency: "usd",
      destination,
      metadata: {
        payoutLedgerId: ledger._id.toString(),
        orderId: ledger.order.toString(),
      },
    });

    ledger.status = "transferred";
    ledger.stripeTransferId = transfer.id;
    await ledger.save();

    const order = await Order.findById(ledger.order);
    if (order) {
      order.adminNotes = `${order.adminNotes ? order.adminNotes + "\n" : ""}Stripe transfer ${transfer.id}`.trim();
      await order.save();
    }

    return NextResponse.json({ ledger, transferId: transfer.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
  }
}
