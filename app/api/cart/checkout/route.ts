import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth-options";
import { DEFAULT_TAX_RATE } from "@/lib/constants";
import { connectDB } from "@/lib/mongodb";
import { generateOrderNumber } from "@/lib/order-number";
import {
  AWOK_STRIPE_CONNECTED_ACCOUNT_ID,
  calculatePlatformFee,
  calculateRestaurantPayout,
  PAYMENT_MODE,
} from "@/lib/payment-config";
import { getStripe } from "@/lib/stripe";
import { lineSubtotalCents, bogoPayableQuantity } from "@/lib/pricing";
import {
  isValidProteinSelection,
  PROTEIN_OPTION_NAME,
  proteinAddonFromSelected,
  requiresProteinChoiceMenuItem,
} from "@/lib/protein-choice";
import { checkoutErrorHttpResponse } from "@/lib/checkout-error-response";
import { checkoutBodySchema } from "@/lib/validators/checkout";
import { getPublicSiteUrlFromRequest } from "@/lib/get-public-site-url";
import { traceOrderEmail } from "@/lib/email/order-email-trace";
import { resolveRestaurantSlugFromRequest } from "@/lib/restaurant-resolve";
import "@/models/Category";
import { MenuItem } from "@/models/MenuItem";
import { Order } from "@/models/Order";
import { Restaurant } from "@/models/Restaurant";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

const A_WOK_SLUG = "a-wok";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = checkoutBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !body.guestInfo) {
      return NextResponse.json({ error: "Sign in or provide guest information" }, { status: 400 });
    }

    await connectDB();
    const slug = resolveRestaurantSlugFromRequest(req);
    const restaurant = await Restaurant.findOne({ slug });
    if (!restaurant || !restaurant.isAcceptingOrders) {
      console.warn("[checkout] restaurant not accepting or missing slug=", slug);
      return NextResponse.json({ error: "Restaurant is not accepting orders" }, { status: 400 });
    }

    const ids = body.items.map((i) => i.menuItemId);
    const menuItems = await MenuItem.find({
      _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
      isAvailable: true,
    })
      .populate("category", "slug")
      .lean();

    if (menuItems.length !== ids.length) {
      return NextResponse.json({ error: "One or more menu items are invalid" }, { status: 400 });
    }

    const itemMap = new Map(menuItems.map((m) => [m._id.toString(), m]));

    for (const line of body.items) {
      const m = itemMap.get(line.menuItemId);
      if (!m) continue;
      const name = m.name as string;
      const cat = m.category as unknown as { slug?: string } | undefined;
      const categorySlug = cat && typeof cat === "object" && "slug" in cat ? cat.slug : undefined;
      const meat = requiresProteinChoiceMenuItem(name, categorySlug);
      if (meat && !isValidProteinSelection(line.selectedOptions)) {
        return NextResponse.json(
          { error: `Choice of Protein is required for "${name}". Open the item on the menu and choose an option.` },
          { status: 400 }
        );
      }
      if (!meat && proteinAddonFromSelected(line.selectedOptions) > 0) {
        return NextResponse.json({ error: "Invalid add-on options for one or more items" }, { status: 400 });
      }
    }

    let subtotal = 0;
    const orderItems = body.items.map((line) => {
      const m = itemMap.get(line.menuItemId);
      if (!m) throw new Error("Missing item");
      const name = m.name as string;
      const cat = m.category as unknown as { slug?: string } | undefined;
      const categorySlug = cat && typeof cat === "object" && "slug" in cat ? cat.slug : undefined;
      const meat = requiresProteinChoiceMenuItem(name, categorySlug);
      const base = m.price as number;
      const addon = meat ? proteinAddonFromSelected(line.selectedOptions) : 0;
      const unit = base + addon;
      const bogo = Boolean(m.bogoEnabled);
      const qty = line.quantity;
      const lineTotal = lineSubtotalCents(unit, qty, bogo);
      const chargedQty = bogo ? bogoPayableQuantity(qty) : qty;
      subtotal += lineTotal;
      return {
        menuItem: m._id,
        name: m.name,
        quantity: qty,
        unitPriceCents: unit,
        lineTotalCents: lineTotal,
        chargedQuantity: chargedQty,
        bogoApplied: bogo,
        notes: line.notes ?? "",
        selectedOptions: line.selectedOptions ?? [],
      };
    });

    const deliveryFee = 0;
    const tax = Math.round((subtotal + deliveryFee) * DEFAULT_TAX_RATE);
    const tip = body.tipCents;
    const total = subtotal + tax + deliveryFee + tip;

    // Integer USD cents: subtotal + tax + delivery + tip (final payable amount).
    const totalAmountInCents = total;

    // Stripe split settings are intentionally hardcoded server-side (see lib/payment-config.ts).
    const destinationAccountId = AWOK_STRIPE_CONNECTED_ACCOUNT_ID;
    const commissionAmount = calculatePlatformFee(totalAmountInCents);
    const restaurantPayoutAmount = calculateRestaurantPayout(totalAmountInCents);

    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      customer: session?.user?.id ? new mongoose.Types.ObjectId(session.user.id) : null,
      guestInfo: session?.user?.id
        ? null
        : {
            name: body.guestInfo!.name,
            email: body.guestInfo!.email,
            phone: body.guestInfo!.phone,
          },
      restaurant: restaurant._id,
      items: orderItems,
      subtotal,
      tax,
      deliveryFee,
      tip,
      total,
      commissionAmount,
      restaurantPayoutAmount,
      paymentMode: PAYMENT_MODE,
      paymentStatus: "pending",
      orderStatus: "new",
      fulfillmentType: body.fulfillmentType,
      pickupTime: body.pickupTime ?? "",
      deliveryAddress: null,
      customerNotes: body.customerNotes ?? "",
      stripeConnectedAccountId: destinationAccountId,
    });

    const stripe = getStripe();
    const siteUrl = getPublicSiteUrlFromRequest(req);
    const siteHost = (() => {
      try {
        return new URL(siteUrl).host;
      } catch {
        return "";
      }
    })();

    let customerName = body.guestInfo?.name?.trim() ?? "";
    if (session?.user?.id) {
      const u = await User.findById(session.user.id).lean();
      customerName = ((u?.name as string) || session.user.email || "").trim();
    }

    const lineItems = orderItems.map((oi) => {
      const descParts: string[] = [];
      const protein = oi.selectedOptions?.find((o) => o.name === PROTEIN_OPTION_NAME);
      if (protein) descParts.push(`Protein: ${protein.value}`);
      if (oi.notes) descParts.push(`Notes: ${oi.notes.slice(0, 100)}`);
      if (oi.bogoApplied && oi.quantity > 1) {
        descParts.push(`Buy 1, get 1 free · ${oi.quantity} in cart · charged for ${oi.chargedQuantity} at menu price`);
      }
      const desc = descParts.join(" · ").slice(0, 500).trim();
      const product_data: { name: string; description?: string } = {
        name: oi.bogoApplied ? `${oi.name} (×${oi.quantity})` : oi.name,
      };
      if (desc) product_data.description = desc;

      return {
        quantity: oi.chargedQuantity,
        price_data: {
          currency: "usd",
          unit_amount: oi.unitPriceCents,
          product_data,
        },
      };
    });

    if (tax > 0) {
      lineItems!.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: tax,
          product_data: { name: "Estimated tax" },
        },
      });
    }
    if (deliveryFee > 0) {
      lineItems!.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: deliveryFee,
          product_data: { name: "Delivery fee" },
        },
      });
    }
    if (tip > 0) {
      lineItems!.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: tip,
          product_data: { name: "Tip" },
        },
      });
    }

    const customerEmail = session?.user?.email ?? body.guestInfo?.email ?? undefined;

    const metadata: Record<string, string> = {
      orderId: order._id.toString(),
      restaurantId: restaurant._id.toString(),
      restaurant_slug: String(restaurant.slug),
      restaurant_name: String(restaurant.name),
      site_domain: siteHost || siteUrl.replace(/^https?:\/\//, "").split("/")[0] || "",
      order_number: orderNumber,
      customer_email: customerEmail ?? "",
      customer_name: customerName,
      customerId: session?.user?.id ?? "guest",
      paymentMode: PAYMENT_MODE,
      connectedAccountId: destinationAccountId,
    };

    if (restaurant.slug === A_WOK_SLUG) {
      metadata.restaurant_name = "A WOK";
    }

    const paymentIntentDescription = `${restaurant.name} online order · #${orderNumber}`;

    const successUrl = `${siteUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`;
    traceOrderEmail("checkout:stripe_success_url", {
      successUrl,
      cancelUrlPrefix: `${siteUrl}/checkout?cancelled=1`,
      restaurantSlug: slug,
      orderNumber,
    });

    // Direct charge on the connected account: the Checkout Session is created in the context
    // of the connected account (stripeAccount header). The platform retains application_fee_amount
    // as its 12% commission; the remaining 88% stays on the connected account automatically.
    // This matches the client's other working restaurant accounts in Stripe Dashboard:
    //   - All Activity shows only the collected application fee (no separate Transfer row)
    //   - Collected fees appear in the connected account's settlement currency (CAD)
    //   - Settlement merchant shows the restaurant name, not the platform
    // Stripe split settings are intentionally hardcoded server-side so restaurant/admin users
    // cannot modify commission or destination account from the admin portal.
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "payment",
      success_url: successUrl,
      cancel_url: `${siteUrl}/checkout?cancelled=1`,
      line_items: lineItems,
      metadata,
      client_reference_id: order._id.toString(),
      customer_email: customerEmail,
      payment_intent_data: {
        application_fee_amount: commissionAmount,
        description: paymentIntentDescription,
        metadata: { ...metadata },
      },
    };

    console.info("[checkout] creating Stripe session order=", orderNumber, "slug=", slug, "success_url=", successUrl);

    // Pass stripeAccount to create the session as a direct charge on the connected account.
    const checkoutSession = await stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: destinationAccountId,
    });

    order.stripeCheckoutSessionId = checkoutSession.id;
    await order.save();

    if (!checkoutSession.url) {
      console.error("[checkout] Stripe session missing url", checkoutSession.id);
      return NextResponse.json({ error: "Checkout session could not be started. Try again." }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url, orderId: order._id.toString(), orderNumber });
  } catch (e) {
    console.error("[checkout]", e);
    const { status, body } = checkoutErrorHttpResponse(e);
    return NextResponse.json(body, { status });
  }
}
