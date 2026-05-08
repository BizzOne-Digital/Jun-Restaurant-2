import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { Restaurant } from "@/models/Restaurant";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    const restaurant = await Restaurant.findOne({ slug: "a-wok" }).lean();
    if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    return NextResponse.json({ restaurant });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
