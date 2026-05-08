import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const menuOptionSchema = new Schema(
  {
    name: { type: String, required: true },
    values: { type: [String], default: [] },
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const menuItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    imageUrl: { type: String, default: "" },
    tags: { type: [String], default: [] },
    spiceLevel: { type: Number, min: 0, max: 5, default: 0 },
    isPopular: { type: Boolean, default: false },
    /** When true, BOGO applies: pay for ceil(qty/2) units at list price. Managed by admin. */
    bogoEnabled: { type: Boolean, default: false },
    /** Units sold (post-payment); drives automatic isPopular. */
    purchaseCount: { type: Number, default: 0, min: 0 },
    isAvailable: { type: Boolean, default: true },
    options: { type: [menuOptionSchema], default: [] },
  },
  { timestamps: true }
);

menuItemSchema.index({ slug: 1, category: 1 }, { unique: true });

export type MenuItemDocument = InferSchemaType<typeof menuItemSchema> & {
  _id: Types.ObjectId;
  category: Types.ObjectId;
};

export const MenuItem: Model<MenuItemDocument> =
  mongoose.models.MenuItem ?? mongoose.model<MenuItemDocument>("MenuItem", menuItemSchema);
