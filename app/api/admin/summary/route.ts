import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";
import { Order } from "@/models/Order";
import { resolveRestaurantSlugFromRequest } from "@/lib/restaurant-resolve";
import { Restaurant } from "@/models/Restaurant";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: Request) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    const today = startOfToday();
    const slug = resolveRestaurantSlugFromRequest(req);
    const restaurant = await Restaurant.findOne({ slug });
    const rid = restaurant?._id;

    const todayOrders = rid
      ? await Order.countDocuments({ restaurant: rid, createdAt: { $gte: today } })
      : 0;

    const paidMatch = rid ? { restaurant: rid, paymentStatus: "paid" as const } : { paymentStatus: "paid" as const };
    const paidOrders = await Order.find(paidMatch).lean();
    const revenue = paidOrders.reduce((s, o) => s + o.total, 0);
    const commission = paidOrders.reduce((s, o) => s + o.commissionAmount, 0);
    const restaurantPayout = paidOrders.reduce((s, o) => s + o.restaurantPayoutAmount, 0);

    const activeMenu = await MenuItem.countDocuments({ isAvailable: true });
    const newCustomers = await User.countDocuments({
      role: "customer",
      createdAt: { $gte: today },
    });

    const statusCounts = rid
      ? await Order.aggregate([
          { $match: { restaurant: rid } },
          { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
        ])
      : [];

    return NextResponse.json({
      todayOrders,
      totalRevenueCents: revenue,
      platformCommissionCents: commission,
      restaurantPayoutCents: restaurantPayout,
      activeMenuItems: activeMenu,
      newCustomers,
      orderStatusOverview: statusCounts,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
