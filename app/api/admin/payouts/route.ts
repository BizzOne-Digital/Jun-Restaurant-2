import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { PayoutLedger } from "@/models/PayoutLedger";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    const payouts = await PayoutLedger.find()
      .sort({ createdAt: -1 })
      .populate({ path: "order", select: "orderNumber total paymentMode paymentStatus createdAt" })
      .lean();
    return NextResponse.json({ payouts });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
