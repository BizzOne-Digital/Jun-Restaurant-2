import { NextResponse } from "next/server";
import type { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { MenuItem } from "@/models/MenuItem";

export const dynamic = "force-dynamic";

type PopulatedCategory = { _id: Types.ObjectId; name: string; slug: string; displayOrder?: number };

export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
    const items = await MenuItem.find({ isAvailable: true })
      .populate("category", "name slug displayOrder")
      .sort({ name: 1 })
      .lean();

    const flat = items.map((i) => {
      const cat = i.category as unknown as PopulatedCategory;
      return {
        _id: i._id.toString(),
        name: i.name,
        slug: i.slug,
        description: i.description,
        price: i.price,
        imageUrl: i.imageUrl,
        tags: i.tags,
        spiceLevel: i.spiceLevel,
        isPopular: i.isPopular,
        bogoEnabled: Boolean(i.bogoEnabled),
        isAvailable: i.isAvailable,
        options: i.options,
        category: {
          _id: cat._id.toString(),
          name: cat.name,
          slug: cat.slug,
          displayOrder: cat.displayOrder,
        },
      };
    });

    const byCategory = categories.map((cat) => ({
      _id: cat._id.toString(),
      name: cat.name,
      slug: cat.slug,
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
      items: flat.filter((i) => i.category._id === cat._id.toString()),
    }));

    return NextResponse.json({ categories: byCategory, items: flat });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load menu" }, { status: 500 });
  }
}
