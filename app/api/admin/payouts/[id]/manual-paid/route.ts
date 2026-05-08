import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { PayoutLedger } from "@/models/PayoutLedger";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    const ledger = await PayoutLedger.findByIdAndUpdate(
      params.id,
      { status: "paid" },
      { new: true }
    ).lean();
    if (!ledger) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ledger });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
