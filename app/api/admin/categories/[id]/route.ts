import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { connectDB } from "@/lib/mongodb";
import { slugify } from "@/lib/utils";
import { Category } from "@/models/Category";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(120).optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
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
    if (parsed.data.name && !parsed.data.slug) {
      update.slug = slugify(parsed.data.name);
    }
    const cat = await Category.findByIdAndUpdate(params.id, update, { new: true }).lean();
    if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ category: cat });
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
    await Category.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
