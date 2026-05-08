import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    const order = await Order.findById(params.id)
      .populate("customer", "name email phone")
      .populate("items.menuItem", "slug imageUrl")
      .lean();
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ order });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
