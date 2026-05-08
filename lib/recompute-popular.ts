import { MenuItem } from "@/models/MenuItem";

/** Mark top sellers as popular based on lifetime purchase units (post-payment). */
const MAX_POPULAR = 12;

export async function recomputePopularItems(): Promise<void> {
  const ranked = await MenuItem.find({}, { _id: 1, purchaseCount: 1, name: 1 })
    .sort({ purchaseCount: -1, name: 1 })
    .lean();

  await MenuItem.updateMany({}, { $set: { isPopular: false } });

  const winners = ranked.filter((r) => (r.purchaseCount ?? 0) > 0).slice(0, MAX_POPULAR);
  if (!winners.length) return;

  const ids = winners.map((w) => w._id);
  await MenuItem.updateMany({ _id: { $in: ids } }, { $set: { isPopular: true } });
}
