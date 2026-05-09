import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { resolveRestaurantSlugFromRequest } from "@/lib/restaurant-resolve";
import { Restaurant } from "@/models/Restaurant";
import { SiteSetting } from "@/models/SiteSetting";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    const slug = resolveRestaurantSlugFromRequest(req);
    const restaurant = await Restaurant.findOne({ slug }).lean();
    if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    const siteSetting =
      (await SiteSetting.findOne({ key: "default" }).lean()) ??
      (await SiteSetting.findOne().sort({ updatedAt: -1 }).lean());
    return NextResponse.json({ restaurant, siteSetting: siteSetting ?? null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
