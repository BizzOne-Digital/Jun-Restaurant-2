import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth-options";
import {
  commissionFromTotalCents,
  DEFAULT_TAX_RATE,
  restaurantPayoutFromTotalCents,
} from "@/lib/constants";
import { connectDB } from "@/lib/mongodb";
import { generateOrderNumber } from "@/lib/order-number";
import { getStripe } from "@/lib/stripe";
import { lineSubtotalCents, bogoPayableQuantity } from "@/lib/pricing";
import {
  isValidProteinSelection,
  PROTEIN_OPTION_NAME,
  proteinAddonFromSelected,
  requiresProteinChoiceMenuItem,
} from "@/lib/protein-choice";
import { checkoutBodySchema } from "@/lib/validators/checkout";
import { MenuItem } from "@/models/MenuItem";
import { Order } from "@/models/Order";
import { Restaurant } from "@/models/Restaurant";

export const dynamic = "force-dynamic";

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
    const restaurant = await Restaurant.findOne({ slug: "a-wok" });
    if (!restaurant || !restaurant.isAcceptingOrders) {
      return NextResponse.json({ error: "Restaurant is not accepting orders" }, { status: 400 });
    }

    const ids = body.items.map((i) => i.menuItemId);
    const menuItems = await MenuItem.find({
      _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
      isAvailable: true,
    }).lean();

    if (menuItems.length !== ids.length) {
      return NextResponse.json({ error: "One or more menu items are invalid" }, { status: 400 });
    }

    const itemMap = new Map(menuItems.map((m) => [m._id.toString(), m]));

    for (const line of body.items) {
      const m = itemMap.get(line.menuItemId);
      if (!m) continue;
      const name = m.name as string;
      const meat = requiresProteinChoiceMenuItem(name);
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
      const meat = requiresProteinChoiceMenuItem(name);
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

    const commissionAmount = commissionFromTotalCents(total);
    const restaurantPayoutAmount = restaurantPayoutFromTotalCents(total);

    const useConnect =
      restaurant.paymentMode === "stripe_connect_split" &&
      Boolean(restaurant.stripeConnectedAccountId?.trim());

    if (restaurant.paymentMode === "stripe_connect_split" && !useConnect) {
      return NextResponse.json(
        { error: "Stripe Connect is not fully configured for this restaurant" },
        { status: 400 }
      );
    }

    const paymentMode = useConnect ? "stripe_connect_split" : "platform_collect";

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
      paymentMode,
      paymentStatus: "pending",
      orderStatus: "new",
      fulfillmentType: body.fulfillmentType,
      pickupTime: body.pickupTime ?? "",
      deliveryAddress: null,
      customerNotes: body.customerNotes ?? "",
      stripeConnectedAccountId: useConnect ? restaurant.stripeConnectedAccountId : "",
    });

    const stripe = getStripe();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

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

    const customerEmail =
      session?.user?.email ?? body.guestInfo?.email ?? undefined;

    const metadata = {
      orderId: order._id.toString(),
      restaurantId: restaurant._id.toString(),
      customerId: session?.user?.id ?? "guest",
      paymentMode,
    };

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "payment",
      success_url: `${siteUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?cancelled=1`,
      line_items: lineItems,
      metadata,
      client_reference_id: order._id.toString(),
      customer_email: customerEmail,
    };

    if (paymentMode === "stripe_connect_split" && restaurant.stripeConnectedAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: commissionAmount,
        transfer_data: {
          destination: restaurant.stripeConnectedAccountId,
        },
      };
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

    order.stripeCheckoutSessionId = checkoutSession.id;
    await order.save();

    return NextResponse.json({ url: checkoutSession.url, orderId: order._id.toString(), orderNumber });
  } catch (e) {
    console.error(e);
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "message" in e
          ? String((e as { message: unknown }).message)
          : "Checkout failed";
    const safeDetail =
      process.env.NODE_ENV === "development"
        ? msg
        : "Checkout failed. Check server logs.";
    return NextResponse.json({ error: safeDetail }, { status: 500 });
  }
}
