import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { orderNumber: string } }) {
  const orderNumber = params.orderNumber;
  if (!orderNumber) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }
  try {
    await connectDB();
    const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() })
      .populate("items.menuItem", "slug imageUrl")
      .lean();
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      fulfillmentType: order.fulfillmentType,
      pickupTime: order.pickupTime,
      deliveryAddress: order.deliveryAddress,
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      deliveryFee: order.deliveryFee,
      tip: order.tip,
      total: order.total,
      customerNotes: order.customerNotes,
      createdAt: order.createdAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }
}
