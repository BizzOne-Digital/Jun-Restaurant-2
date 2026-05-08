import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const guestInfoSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceCents: { type: Number, required: true },
    lineTotalCents: { type: Number, required: true },
    /** Units charged at unit price (differs under BOGO). Defaults to quantity if omitted (legacy orders). */
    chargedQuantity: { type: Number, min: 1 },
    bogoApplied: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    selectedOptions: { type: [{ name: String, value: String }], default: [] },
  },
  { _id: false }
);

const deliveryAddressSchema = new Schema(
  {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", default: null },
    guestInfo: { type: guestInfoSchema, default: null },
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },
    total: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    restaurantPayoutAmount: { type: Number, required: true },
    paymentMode: {
      type: String,
      enum: ["platform_collect", "stripe_connect_split"],
      required: true,
    },
    stripeCheckoutSessionId: { type: String, default: "" },
    stripePaymentIntentId: { type: String, default: "" },
    stripeConnectedAccountId: { type: String, default: "" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    orderStatus: {
      type: String,
      enum: ["new", "accepted", "preparing", "ready", "completed", "cancelled"],
      default: "new",
    },
    fulfillmentType: {
      type: String,
      enum: ["pickup", "delivery"],
      required: true,
    },
    pickupTime: { type: String, default: "" },
    deliveryAddress: { type: deliveryAddressSchema, default: null },
    customerNotes: { type: String, default: "" },
    adminNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

export type OrderDocument = InferSchemaType<typeof orderSchema> & {
  _id: Types.ObjectId;
  customer: Types.ObjectId | null;
  restaurant: Types.ObjectId;
};

export const Order: Model<OrderDocument> =
  mongoose.models.Order ?? mongoose.model<OrderDocument>("Order", orderSchema);
