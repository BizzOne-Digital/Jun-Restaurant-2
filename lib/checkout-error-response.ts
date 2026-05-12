import mongoose from "mongoose";
import Stripe from "stripe";

export type CheckoutErrorBody = {
  error: string;
  /** Stable code for support / logs (not a secret). */
  code?: string;
};

/**
 * Map thrown errors to HTTP status + a message safe to show in production UI.
 * Full errors are still logged by the route handler.
 */
export function checkoutErrorHttpResponse(error: unknown): { status: number; body: CheckoutErrorBody } {
  if (error instanceof Stripe.errors.StripeError) {
    return { status: 400, body: { error: error.message, code: `stripe_${error.code ?? "error"}` } };
  }

  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "";

  const lower = msg.toLowerCase();

  if (msg.includes("STRIPE_SECRET_KEY")) {
    return {
      status: 503,
      body: {
        error: "Payment is not configured: add STRIPE_SECRET_KEY in your deployment environment (Vercel → Settings → Environment Variables).",
        code: "stripe_secret_missing",
      },
    };
  }

  if (
    msg.includes("MONGODB_URI") ||
    lower.includes("mongoserverselectionerror") ||
    lower.includes("mongonetworkerror") ||
    lower.includes("mongoauth") ||
    lower.includes("authentication failed") ||
    (lower.includes("enotfound") && lower.includes("mongodb"))
  ) {
    return {
      status: 503,
      body: {
        error:
          "Database is not reachable or not configured. In Vercel, set MONGODB_URI to your Atlas connection string (include user/password and retryWrites). Redeploy after saving.",
        code: "database_unavailable",
      },
    };
  }

  if (msg.includes("E11000") || lower.includes("duplicate key")) {
    return {
      status: 409,
      body: { error: "Could not create this order (conflict). Please try again.", code: "duplicate_order" },
    };
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const first = Object.values(error.errors)[0]?.message;
    return {
      status: 400,
      body: {
        error: first ? `Order validation failed: ${first}` : "Order validation failed.",
        code: "order_validation",
      },
    };
  }

  if (process.env.NODE_ENV === "development") {
    return {
      status: 500,
      body: { error: msg || "Checkout failed", code: "unknown" },
    };
  }

  return {
    status: 500,
    body: {
      error:
        "Checkout failed. In Vercel → Logs, filter for “[checkout]”. Typical fixes: set MONGODB_URI and STRIPE_SECRET_KEY; set NEXT_PUBLIC_SITE_URL to your live https URL; seed production Mongo with your restaurant (slug must match RESTAURANT_SLUG / host map).",
      code: "checkout_failed",
    },
  };
}
