import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";

const bodySchema = z.object({
  orderStatus: z.enum(["new", "accepted", "preparing", "ready", "completed", "cancelled"]),
});

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await connectDB();
    const order = await Order.findByIdAndUpdate(
      params.id,
      { orderStatus: parsed.data.orderStatus },
      { new: true }
    ).lean();
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ order });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
