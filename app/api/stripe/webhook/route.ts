import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { syncPaidOrderFromPaymentIntent, syncPaidOrderFromStripeCheckout } from "@/lib/stripe-order-payment-sync";
import { traceOrderEmail } from "@/lib/email/order-email-trace";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET or stripe-signature missing");
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

  console.info("[stripe webhook] event", event.type, "id=", event.id);

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      traceOrderEmail("stripe_webhook:checkout_event_received", {
        eventType: event.type,
        sessionId: session.id,
        hasOrderIdMetadata: Boolean(session.metadata?.orderId ?? session.client_reference_id),
      });
      const sync = await syncPaidOrderFromStripeCheckout(session);
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
