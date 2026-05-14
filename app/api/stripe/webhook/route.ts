import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { syncPaidOrderFromStripeCheckout, syncPaidOrderFromStripeCheckoutDirect, syncPaidOrderFromPaymentIntent } from "@/lib/stripe-order-payment-sync";
import { traceOrderEmail } from "@/lib/email/order-email-trace";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  // stripe-account header is present when the event originates from a connected account webhook
  const stripeAccountHeader = req.headers.get("stripe-account");

  // Choose the correct webhook secret:
  //   - STRIPE_CONNECT_WEBHOOK_SECRET: registered on the connected account in Stripe Dashboard
  //   - STRIPE_WEBHOOK_SECRET: registered on the platform account
  const connectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  const platformSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Prefer the connect secret when the event comes from a connected account, fall back to platform.
  const secret = stripeAccountHeader && connectSecret ? connectSecret : platformSecret;

  if (!sig || !secret) {
    console.error("[stripe webhook] webhook secret or stripe-signature missing", {
      hasSignatureHeader: Boolean(sig),
      hasSecret: Boolean(secret),
      isConnectEvent: Boolean(stripeAccountHeader),
    });
    traceOrderEmail("stripe_webhook:rejected_missing_secret_or_header", {
      hasSignatureHeader: Boolean(sig),
      hasWebhookSecretEnv: Boolean(secret),
    });
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.info("[stripe webhook] event", event.type, "id=", event.id, "account=", stripeAccountHeader ?? "platform");

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      traceOrderEmail("stripe_webhook:checkout_event_received", {
        eventType: event.type,
        sessionId: session.id,
        hasOrderIdMetadata: Boolean(session.metadata?.orderId ?? session.client_reference_id),
        isConnectEvent: Boolean(stripeAccountHeader),
      });

      // For direct charges the session lives on the connected account — pass the account ID
      // so the sync function can retrieve it with the correct stripeAccount context if needed.
      const sync = stripeAccountHeader
        ? await syncPaidOrderFromStripeCheckoutDirect(session, stripeAccountHeader)
        : await syncPaidOrderFromStripeCheckout(session);

      if (!sync.ok) {
        console.warn("[stripe webhook] checkout sync result", event.type, session.id, sync.error);
        traceOrderEmail("stripe_webhook:checkout_sync_failed", { error: sync.error, sessionId: session.id });
      } else {
        console.info(
          "[stripe webhook] checkout sync ok",
          session.id,
          "db_payment=",
          sync.paymentStatus,
          "order=",
          sync.orderNumber
        );
      }
    } else if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await syncPaidOrderFromPaymentIntent(pi);
    } else if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.warn("[stripe webhook] payment_intent.payment_failed", pi.id, pi.last_payment_error?.message);
    }
  } catch (e) {
    console.error("[stripe webhook] handler error", event.type, e);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
