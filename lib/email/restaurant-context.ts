import { connectDB } from "@/lib/mongodb";
import { Restaurant } from "@/models/Restaurant";
import { SiteSetting } from "@/models/SiteSetting";
import {
  DEFAULT_PICKUP_PREPARE_MINUTES,
  RESTAURANT_ADDRESS_LINES,
  RESTAURANT_DISPLAY_NAME,
} from "@/lib/email/constants";
import { emailSafeLogoUrl } from "@/lib/email/restaurant-logo";

export type RestaurantEmailContext = {
  restaurantName: string;
  /** Absolute https logo URL safe for email `<img>`, or null to show text header only. */
  logoUrl: string | null;
  pickupPrepareMinutes: number;
  /** Kitchen / public order inbox (from SiteSetting or empty). */
  email: string | null;
  addressLines: string[];
};

function addressLinesFromRestaurant(address: string | undefined): string[] {
  if (!address?.trim()) return [...RESTAURANT_ADDRESS_LINES];
  return address
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Loads branding + contact context for transactional emails.
 * `siteOrigin` should be `NEXT_PUBLIC_SITE_URL` (no trailing slash preferred).
 */
export async function loadRestaurantEmailContext(siteOrigin: string): Promise<RestaurantEmailContext> {
  await connectDB();
  const site =
    (await SiteSetting.findOne({ key: "default" }).lean()) ??
    (await SiteSetting.findOne().sort({ updatedAt: -1 }).lean());
  const restaurant = await Restaurant.findOne({ slug: "a-wok" }).lean();

  const restaurantName =
    (site?.restaurantName && String(site.restaurantName).trim()) ||
    (restaurant?.name && String(restaurant.name).trim()) ||
    RESTAURANT_DISPLAY_NAME;

  const rawLogo = (site?.logo && String(site.logo).trim()) || (restaurant?.logoUrl && String(restaurant.logoUrl).trim()) || "";
  const logoUrl = emailSafeLogoUrl(rawLogo, siteOrigin);

  const pickupPrepareMinutes = (() => {
    const n = site?.pickupPrepareTimeMinutes;
    if (typeof n === "number" && Number.isFinite(n)) {
      return Math.min(240, Math.max(1, Math.round(n)));
    }
    return DEFAULT_PICKUP_PREPARE_MINUTES;
  })();

  const emailRaw = (site?.email && String(site.email).trim()) || "";
  const email = emailRaw.length > 0 ? emailRaw : null;

  const addressLines = addressLinesFromRestaurant(restaurant?.address as string | undefined);

  return {
    restaurantName,
    logoUrl,
    pickupPrepareMinutes,
    email,
    addressLines,
  };
}
