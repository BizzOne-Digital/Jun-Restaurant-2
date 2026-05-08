import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  const q = new URL(req.url).searchParams.get("q")?.trim();

  try {
    await connectDB();
    const filter: Record<string, unknown> = { role: "customer" };
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { phone: new RegExp(q, "i") },
      ];
    }
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ users });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
