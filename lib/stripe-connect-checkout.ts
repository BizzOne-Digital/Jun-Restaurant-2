/**
 * Stripe Connect destination charges for Checkout Sessions (payment_intent_data).
 * Platform keeps funds equal to application_fee_amount; the remainder is transferred
 * to the connected account via transfer_data.destination.
 */
import type { RestaurantDocument } from "@/models/Restaurant";

export const A_WOK_SLUG = "a-wok";
/** Fallback Connect account when A WOK has no ID stored in Mongo yet. */
export const A_WOK_DEFAULT_STRIPE_CONNECT_ACCOUNT_ID = "acct_1TUzIAKCfxKlyEKO";

/** Resolve Stripe Connect destination (connected account id). DB wins; A WOK falls back to default acct. */
export function resolveStripeConnectDestinationId(r: RestaurantDocument): string {
  const fromDb =
    `${r.stripeConnectedAccountId ?? ""}`.trim() || `${r.stripeAccountId ?? ""}`.trim();
  if (fromDb) return fromDb;
  if (r.slug === A_WOK_SLUG) return A_WOK_DEFAULT_STRIPE_CONNECT_ACCOUNT_ID;
  return "";
}

/**
 * A WOK (slug a-wok) always uses a Connect destination charge when a destination id exists (including default).
 * Other restaurants use the same split only when paymentMode is stripe_connect_split.
 */
export function shouldUseStripeConnectDestinationCharge(
  r: Pick<RestaurantDocument, "slug" | "paymentMode">,
  destinationAccountId: string
): boolean {
  if (!destinationAccountId.trim()) return false;
  if (r.slug === A_WOK_SLUG) return true;
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
