/** Fallback when SiteSetting / Restaurant name is missing — real restaurant name only, never a platform brand. */
export const RESTAURANT_DISPLAY_NAME = "A Wok";

export const RESTAURANT_ADDRESS_LINES = ["1025 A St", "Hayward, CA 94541"];

export const DEFAULT_PICKUP_PREPARE_MINUTES = 20;

export function formatPickupPrepareWindow(minutes: number): string {
  const m = Math.max(1, Math.round(minutes));
  return `${m} minute${m === 1 ? "" : "s"}`;
}
