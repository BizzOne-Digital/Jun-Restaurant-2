import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { SiteSetting } from "@/models/SiteSetting";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  restaurantName: z.string().min(1).max(120).optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  logo: z.string().max(2000).optional(),
  pickupPrepareTimeMinutes: z.coerce.number().int().min(1).max(240).optional(),
});

export async function GET() {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    const site =
      (await SiteSetting.findOne({ key: "default" }).lean()) ??
      (await SiteSetting.findOne().sort({ updatedAt: -1 }).lean());
    return NextResponse.json({ siteSetting: site ?? null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

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
    const d = parsed.data;
    const $set: Record<string, unknown> = { key: "default" };
    if (d.restaurantName !== undefined) $set.restaurantName = d.restaurantName;
    if (d.email !== undefined) $set.email = d.email;
    if (d.logo !== undefined) $set.logo = d.logo;
    if (d.pickupPrepareTimeMinutes !== undefined) $set.pickupPrepareTimeMinutes = d.pickupPrepareTimeMinutes;

    const site = await SiteSetting.findOneAndUpdate({ key: "default" }, { $set }, { upsert: true, new: true }).lean();
    return NextResponse.json({ siteSetting: site });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
