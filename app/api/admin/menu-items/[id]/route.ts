import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { slugify } from "@/lib/utils";
import { MenuItem } from "@/models/MenuItem";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  slug: z.string().min(1).max(180).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().int().min(0).optional(),
  categoryId: z.string().optional(),
  imageUrl: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  spiceLevel: z.number().int().min(0).max(5).optional(),
  isPopular: z.boolean().optional(),
  bogoEnabled: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  options: z
    .array(
      z.object({
        name: z.string(),
        values: z.array(z.string()),
        required: z.boolean().optional(),
      })
    )
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await connectDB();
    const update: Record<string, unknown> = { ...parsed.data };
    delete update.categoryId;
    if (parsed.data.categoryId) {
      update.category = new mongoose.Types.ObjectId(parsed.data.categoryId);
    }
    if (parsed.data.name && !parsed.data.slug) {
      const current = await MenuItem.findById(params.id).populate("category", "slug");
      const catSlug = (current?.category as { slug?: string } | undefined)?.slug ?? "item";
      update.slug = `${catSlug}-${slugify(parsed.data.name)}`.slice(0, 180);
    }

    const item = await MenuItem.findByIdAndUpdate(params.id, update, { new: true }).lean();
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    await MenuItem.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
