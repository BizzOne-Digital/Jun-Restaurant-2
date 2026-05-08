import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { Restaurant } from "@/models/Restaurant";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  paymentMode: z.enum(["platform_collect", "stripe_connect_split"]),
  stripeConnectedAccountId: z.string().max(120).optional(),
  hasSubmittedVoidCheckAndId: z.boolean().optional(),
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
    const existing = await Restaurant.findOne({ slug: "a-wok" });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (parsed.data.paymentMode === "stripe_connect_split") {
      const nextId = (parsed.data.stripeConnectedAccountId ?? existing.stripeConnectedAccountId ?? "").trim();
      if (!nextId) {
        return NextResponse.json(
          { error: "Stripe Connected Account ID is required for Connect split mode" },
          { status: 400 }
        );
      }
    }

    const update: Record<string, unknown> = {
      paymentMode: parsed.data.paymentMode,
    };
    if (parsed.data.stripeConnectedAccountId !== undefined) {
      update.stripeConnectedAccountId = parsed.data.stripeConnectedAccountId.trim();
    }
    if (parsed.data.hasSubmittedVoidCheckAndId !== undefined) {
      update.hasSubmittedVoidCheckAndId = parsed.data.hasSubmittedVoidCheckAndId;
    }

    const restaurant = await Restaurant.findOneAndUpdate({ slug: "a-wok" }, update, { new: true }).lean();
    return NextResponse.json({ restaurant });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
