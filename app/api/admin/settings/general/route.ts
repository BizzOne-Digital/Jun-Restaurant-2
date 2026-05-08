import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { Restaurant } from "@/models/Restaurant";

export const dynamic = "force-dynamic";

const openingSchema = z.object({
  day: z.string(),
  open: z.string().optional(),
  close: z.string().optional(),
  closed: z.boolean().optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  address: z.string().min(1).max(300).optional(),
  phone: z.string().min(5).max(40).optional(),
  logoUrl: z.string().max(2000).optional(),
  heroImageUrl: z.string().max(2000).optional(),
  openingHours: z.array(openingSchema).optional(),
  isAcceptingOrders: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await connectDB();
    const restaurant = await Restaurant.findOneAndUpdate({ slug: "a-wok" }, parsed.data, {
      new: true,
    }).lean();
    if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ restaurant });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
