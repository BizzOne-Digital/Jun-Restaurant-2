import { NextResponse } from "next/server";
import { sanitizeRestaurantForAdminClient } from "@/lib/admin-api-sanitize";
import { connectDB } from "@/lib/mongodb";
import { resolveRestaurantSlugFromRequest } from "@/lib/restaurant-resolve";
import { Restaurant } from "@/models/Restaurant";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();
    const slug = resolveRestaurantSlugFromRequest(req);
    const restaurant = await Restaurant.findOne({ slug }).lean();
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found", slug }, { status: 404 });
    }
    return NextResponse.json({
      restaurant: sanitizeRestaurantForAdminClient(restaurant as unknown as Record<string, unknown>),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
