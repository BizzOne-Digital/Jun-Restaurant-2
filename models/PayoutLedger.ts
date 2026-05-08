import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const payoutLedgerSchema = new Schema(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    totalCollected: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    restaurantPayoutAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "transferred", "failed"],
      default: "pending",
    },
    stripeTransferId: { type: String, default: "" },
    payoutScenario: {
      type: String,
      enum: ["platform_collect_then_later_payout", "instant_connect_split"],
      required: true,
    },
  },
  { timestamps: true }
);

payoutLedgerSchema.index({ order: 1 }, { unique: true });

export type PayoutLedgerDocument = InferSchemaType<typeof payoutLedgerSchema> & {
  _id: Types.ObjectId;
  restaurant: Types.ObjectId;
  order: Types.ObjectId;
};

export const PayoutLedger: Model<PayoutLedgerDocument> =
  mongoose.models.PayoutLedger ??
  mongoose.model<PayoutLedgerDocument>("PayoutLedger", payoutLedgerSchema);
