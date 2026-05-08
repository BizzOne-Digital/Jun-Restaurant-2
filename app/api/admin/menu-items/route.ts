import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { slugify } from "@/lib/utils";
import { Category } from "@/models/Category";
import { MenuItem } from "@/models/MenuItem";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(160),
  slug: z.string().min(1).max(180).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().int().min(0),
  categoryId: z.string().min(1),
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

export async function GET() {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    const items = await MenuItem.find()
      .populate("category", "name slug")
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await connectDB();
    const category = await Category.findById(parsed.data.categoryId);
    if (!category) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    const baseSlug = parsed.data.slug?.trim() || slugify(parsed.data.name);
    const slug = `${category.slug}-${baseSlug}`.slice(0, 180);

    const item = await MenuItem.create({
      name: parsed.data.name,
      slug,
      description: parsed.data.description ?? "",
      price: parsed.data.price,
      category: new mongoose.Types.ObjectId(parsed.data.categoryId),
      imageUrl: parsed.data.imageUrl ?? "",
      tags: parsed.data.tags ?? [],
      spiceLevel: parsed.data.spiceLevel ?? 0,
      isPopular: parsed.data.isPopular ?? false,
      bogoEnabled: parsed.data.bogoEnabled ?? false,
      isAvailable: parsed.data.isAvailable ?? true,
      options: parsed.data.options ?? [],
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
