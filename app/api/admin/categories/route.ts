import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { slugify } from "@/lib/utils";
import { Category } from "@/models/Category";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  try {
    await connectDB();
    const categories = await Category.find().sort({ displayOrder: 1 }).lean();
    return NextResponse.json({ categories });
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
    const slug = parsed.data.slug?.trim() || slugify(parsed.data.name);
    const cat = await Category.create({
      name: parsed.data.name,
      slug,
      displayOrder: parsed.data.displayOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json({ category: cat });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
