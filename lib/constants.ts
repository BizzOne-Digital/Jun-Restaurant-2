/** Default sales tax rate for Hayward, CA area (simplified; configure per deployment). */
export const DEFAULT_TAX_RATE = 0.0975;

export const DELIVERY_FEE_CENTS = 399;

export const PLATFORM_COMMISSION_RATE = 0.1;

export function commissionFromTotalCents(totalCents: number): number {
  return Math.round(totalCents * PLATFORM_COMMISSION_RATE);
}

export function restaurantPayoutFromTotalCents(totalCents: number): number {
  return totalCents - commissionFromTotalCents(totalCents);
}
