import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const openingSlotSchema = new Schema(
  {
    day: { type: String, required: true },
    open: { type: String, default: "" },
    close: { type: String, default: "" },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const restaurantSchema = new Schema(
  {
    name: { type: String, required: true, default: "A Wok" },
    slug: { type: String, required: true, unique: true, default: "a-wok" },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    logoUrl: { type: String, default: "/awok-logo.png" },
    heroImageUrl: { type: String, default: "" },
    /** Legacy / compatibility only — checkout uses hardcoded Connect settings (see lib/payment-config.ts). */
    stripeConnectedAccountId: { type: String, default: "" },
    /** Legacy / compatibility only — not used for checkout routing. */
    stripeAccountId: { type: String, default: "" },
    /** Legacy / compatibility only — not exposed in admin. */
    hasSubmittedVoidCheckAndId: { type: Boolean, default: false },
    /** Legacy / compatibility only — not used to control checkout split. */
    paymentMode: {
      type: String,
      enum: ["platform_collect", "stripe_connect_split"],
      default: "platform_collect",
    },
    /** Legacy / compatibility only — commission is hardcoded server-side for new checkouts. */
    commissionPercentage: { type: Number, default: 10 },
    /** Legacy / compatibility only — not used for checkout routing. */
    commissionRate: { type: Number },
    openingHours: { type: [openingSlotSchema], default: [] },
    isAcceptingOrders: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type RestaurantDocument = InferSchemaType<typeof restaurantSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Restaurant: Model<RestaurantDocument> =
  mongoose.models.Restaurant ?? mongoose.model<RestaurantDocument>("Restaurant", restaurantSchema);
