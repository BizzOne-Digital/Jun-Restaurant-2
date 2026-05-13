import { NextResponse } from "next/server";
import { sanitizeOrderForAdminClient } from "@/lib/admin-api-sanitize";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { resolveRestaurantSlugFromRequest } from "@/lib/restaurant-resolve";
import { Order } from "@/models/Order";
import { Restaurant } from "@/models/Restaurant";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    const slug = resolveRestaurantSlugFromRequest(req);
    const restaurant = await Restaurant.findOne({ slug }).lean();

    const order = await Order.findById(params.id)
      .populate("customer", "name email phone")
      .populate("items.menuItem", "slug imageUrl")
      .lean();
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (restaurant && String(order.restaurant) !== String(restaurant._id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ order: sanitizeOrderForAdminClient(order as unknown as Record<string, unknown>) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
