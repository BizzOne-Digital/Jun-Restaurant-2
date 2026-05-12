import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { resolveRestaurantSlugFromRequest } from "@/lib/restaurant-resolve";
import { Restaurant } from "@/models/Restaurant";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  paymentMode: z.enum(["platform_collect", "stripe_connect_split"]),
  stripeConnectedAccountId: z.string().max(200).optional(),
  stripeAccountId: z.string().max(200).optional(),
  hasSubmittedVoidCheckAndId: z.boolean().optional(),
  commissionRate: z.number().min(0).max(1).optional().nullable(),
  commissionPercentage: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(req: Request) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const $set: Record<string, unknown> = { paymentMode: data.paymentMode };
  if (data.stripeConnectedAccountId !== undefined) {
    $set.stripeConnectedAccountId = String(data.stripeConnectedAccountId ?? "").trim();
  }
  if (data.stripeAccountId !== undefined) {
    $set.stripeAccountId = String(data.stripeAccountId ?? "").trim();
  }
  if (data.hasSubmittedVoidCheckAndId !== undefined) {
    $set.hasSubmittedVoidCheckAndId = data.hasSubmittedVoidCheckAndId;
  }
  if (data.commissionPercentage !== undefined) {
    $set.commissionPercentage = data.commissionPercentage;
  }
  if (data.commissionRate !== undefined && data.commissionRate !== null) {
    $set.commissionRate = data.commissionRate;
  }

  const updateQuery: mongoose.UpdateQuery = { $set };
  if (data.commissionRate === null) {
    updateQuery.$unset = { commissionRate: "" };
  }

  try {
    await connectDB();
    const slug = resolveRestaurantSlugFromRequest(req);
    const restaurant = await Restaurant.findOneAndUpdate({ slug }, updateQuery, {
      new: true,
    }).lean();
    if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ restaurant });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
