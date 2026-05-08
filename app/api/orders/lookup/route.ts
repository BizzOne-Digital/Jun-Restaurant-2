import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }
  try {
    await connectDB();
    const order = await Order.findOne({ stripeCheckoutSessionId: sessionId }).lean();
    if (!order) {
      return NextResponse.json({ found: false });
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
    console.error(e);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
