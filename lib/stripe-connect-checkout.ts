/**
 * Stripe Connect destination charges for Checkout Sessions (payment_intent_data).
 * Platform keeps funds equal to application_fee_amount; the remainder is transferred
 * to the connected account via transfer_data.destination.
 */
import type { RestaurantDocument } from "@/models/Restaurant";

export const A_WOK_SLUG = "a-wok";

/**
 * Resolve Stripe Connect destination (connected account id) from the restaurant record.
 * Optional env `STRIPE_A_WOK_DEFAULT_CONNECT_ACCOUNT_ID` supplies a fallback for slug `a-wok`
 * when DB fields are empty (use only when that Connect account has transfers active).
 */
export function resolveStripeConnectDestinationId(r: RestaurantDocument): string {
  const fromDb =
    `${r.stripeConnectedAccountId ?? ""}`.trim() || `${r.stripeAccountId ?? ""}`.trim();
  if (fromDb) return fromDb;
  if (r.slug === A_WOK_SLUG) {
    return `${process.env.STRIPE_A_WOK_DEFAULT_CONNECT_ACCOUNT_ID ?? ""}`.trim();
  }
  return "";
}

/**
 * Use Stripe Connect destination charges only when the restaurant is configured for split
 * payouts and a destination account id is present. Requires the connected account to have
 * the transfers capability (onboarding complete); otherwise Stripe returns
 * insufficient_capabilities_for_transfer.
 */
export function shouldUseStripeConnectDestinationCharge(
  r: Pick<RestaurantDocument, "paymentMode">,
  destinationAccountId: string
): boolean {
  if (!destinationAccountId.trim()) return false;
  return r.paymentMode === "stripe_connect_split";
}
/**
 * Platform commission as a fraction of the charge (0–1) for application_fee_amount.
 * Prefer commissionRate (e.g. 0.12); else commissionPercentage / 100; else defaults.
 */
export function connectPlatformFeeFraction(r: RestaurantDocument): number {
  const cr = r.commissionRate;
  if (typeof cr === "number" && Number.isFinite(cr) && cr > 0 && cr < 1) return cr;
  const pct = Number(r.commissionPercentage);
  if (Number.isFinite(pct) && pct >= 0 && pct <= 100) return Math.min(0.99, pct / 100);
  return r.slug === A_WOK_SLUG ? 0.12 : 0.1;
}

