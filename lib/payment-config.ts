/**
 * Stripe Connect split settings are intentionally hardcoded server-side so restaurant/admin
 * users cannot modify commission or destination account from the admin portal.
 */
export const AWOK_STRIPE_CONNECTED_ACCOUNT_ID = "acct_1TWPV5GwGCXDbXSb";
export const PLATFORM_COMMISSION_RATE = 0.12;
export const PAYMENT_MODE = "stripe_connect_split" as const;

export function calculatePlatformFee(amountInCents: number): number {
  return Math.round(amountInCents * PLATFORM_COMMISSION_RATE);
}

export function calculateRestaurantPayout(amountInCents: number): number {
  return amountInCents - calculatePlatformFee(amountInCents);
}
