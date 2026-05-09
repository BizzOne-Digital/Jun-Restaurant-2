import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { resolveRestaurantSlugFromRequest } from "@/lib/restaurant-resolve";
import { Restaurant } from "@/models/Restaurant";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  const { searchParams } = new URL(req.url);
  const orderStatus = searchParams.get("orderStatus") || undefined;
  const paymentStatus = searchParams.get("paymentStatus") || undefined;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  try {
    await connectDB();
    const slug = resolveRestaurantSlugFromRequest(req);
    const restaurant = await Restaurant.findOne({ slug });
    const filter: Record<string, unknown> = {};
    if (restaurant) filter.restaurant = restaurant._id;
    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) (filter.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      if (dateTo) (filter.createdAt as Record<string, Date>).$lte = new Date(dateTo);
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("customer", "name email phone")
      .lean();

    return NextResponse.json({ orders });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
