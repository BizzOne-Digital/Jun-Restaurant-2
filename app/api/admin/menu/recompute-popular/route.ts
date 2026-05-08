import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { recomputePopularItems } from "@/lib/recompute-popular";

export const dynamic = "force-dynamic";

export async function POST() {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;
  try {
    await connectDB();
    await recomputePopularItems();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
