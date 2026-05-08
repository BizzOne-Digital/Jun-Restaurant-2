/**
 * Set each menu item's imageUrl to `/menu/{slug}.jpg` to match files in public/menu/.
 * Run: npm run backfill:menu-images
 *
 * If you use .webp instead, change MENU_IMAGE_EXT below and re-run.
 */
import "dotenv/config";
import { connectDB } from "../lib/mongodb";
import { MenuItem } from "../models/MenuItem";

const MENU_IMAGE_EXT = ".jpg";

async function main() {
  await connectDB();
  const items = await MenuItem.find({}).select("slug").lean();
  let n = 0;
  for (const item of items) {
    const slug = item.slug as string;
    const imageUrl = `/menu/${slug}${MENU_IMAGE_EXT}`;
    const res = await MenuItem.updateOne({ _id: item._id }, { $set: { imageUrl } });
    if (res.modifiedCount) n += 1;
  }
  // eslint-disable-next-line no-console
  console.log(`Updated imageUrl for ${n} of ${items.length} menu items → /menu/<slug>${MENU_IMAGE_EXT}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
