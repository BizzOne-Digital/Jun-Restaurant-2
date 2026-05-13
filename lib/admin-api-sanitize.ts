/** Fields that must never be returned to admin clients or accepted from admin updates. */
const RESTAURANT_SENSITIVE_KEYS = [
  "paymentMode",
  "stripeConnectedAccountId",
  "stripeAccountId",
  "commissionPercentage",
  "commissionRate",
  "hasSubmittedVoidCheckAndId",
] as const;

const ORDER_SENSITIVE_KEYS = ["paymentMode", "commissionAmount", "restaurantPayoutAmount", "stripeConnectedAccountId"] as const;

function omitKeys<T extends Record<string, unknown>>(obj: T, keys: readonly string[]): T {
  const out = { ...obj } as Record<string, unknown>;
  for (const k of keys) delete out[k];
  return out as T;
}

export function sanitizeRestaurantForAdminClient<T extends Record<string, unknown>>(restaurant: T | null): T | null {
  if (!restaurant) return null;
  return omitKeys(restaurant, RESTAURANT_SENSITIVE_KEYS);
}

export function sanitizeOrderForAdminClient<T extends Record<string, unknown>>(order: T | null): T | null {
  if (!order) return null;
  return omitKeys(order, ORDER_SENSITIVE_KEYS);
}

export function stripSensitiveRestaurantFieldsFromBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  for (const k of RESTAURANT_SENSITIVE_KEYS) delete out[k];
  return out;
}
