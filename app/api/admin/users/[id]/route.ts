import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { resolveRestaurantSlugFromRequest } from "@/lib/restaurant-resolve";
import { Restaurant } from "@/models/Restaurant";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  isBlocked: z.boolean(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    const user = await User.findById(params.id).select("-passwordHash").lean();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const slug = resolveRestaurantSlugFromRequest(req);
    const restaurant = await Restaurant.findOne({ slug });
    const orders = await Order.find({
      customer: user._id,
      ...(restaurant ? { restaurant: restaurant._id } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("orderNumber total orderStatus paymentStatus createdAt")
      .lean();
    return NextResponse.json({ user, orders });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await connectDB();
    const user = await User.findByIdAndUpdate(params.id, { isBlocked: parsed.data.isBlocked }, { new: true })
      .select("-passwordHash")
      .lean();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
