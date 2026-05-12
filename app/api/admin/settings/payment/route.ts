import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { resolveRestaurantSlugFromRequest } from "@/lib/restaurant-resolve";
import { Restaurant } from "@/models/Restaurant";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  paymentMode: z.enum(["platform_collect", "stripe_connect_split"]),
  stripeConnectedAccountId: z.string().max(120).optional(),
  /** Optional alias for the same Stripe Connect `acct_` id. */
  stripeAccountId: z.string().max(120).optional(),
  hasSubmittedVoidCheckAndId: z.boolean().optional(),
  /** Platform commission as decimal, e.g. 0.12 for 12% (Connect application fee). */
  commissionRate: z.number().min(0).max(1).optional().nullable(),
  commissionPercentage: z.number().min(0).max(100).optional(),
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
    const slug = resolveRestaurantSlugFromRequest(req);
    const existing = await Restaurant.findOne({ slug });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const mergedConnect = `${parsed.data.stripeConnectedAccountId ?? existing.stripeConnectedAccountId ?? ""}`.trim();
    const mergedStripeAcct = `${parsed.data.stripeAccountId ?? (existing as { stripeAccountId?: string }).stripeAccountId ?? ""}`.trim();
    const mergedDestination = mergedConnect || mergedStripeAcct;

    if (parsed.data.paymentMode === "stripe_connect_split" && !mergedDestination) {
      return NextResponse.json(
        { error: "Stripe Connected Account ID (or stripeAccountId) is required for Connect split mode" },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {
      paymentMode: parsed.data.paymentMode,
    };
    if (parsed.data.stripeConnectedAccountId !== undefined) {
      update.stripeConnectedAccountId = parsed.data.stripeConnectedAccountId.trim();
    }
    if (parsed.data.stripeAccountId !== undefined) {
      update.stripeAccountId = parsed.data.stripeAccountId.trim();
    }
    if (parsed.data.hasSubmittedVoidCheckAndId !== undefined) {
      update.hasSubmittedVoidCheckAndId = parsed.data.hasSubmittedVoidCheckAndId;
    }
    if (parsed.data.commissionRate !== undefined) {
      update.commissionRate = parsed.data.commissionRate;
    }
    if (parsed.data.commissionPercentage !== undefined) {
      update.commissionPercentage = parsed.data.commissionPercentage;
    }

    const restaurant = await Restaurant.findOneAndUpdate({ slug }, update, { new: true }).lean();
    return NextResponse.json({ restaurant });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
