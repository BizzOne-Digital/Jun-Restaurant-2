import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: false }
);

export type CategoryDocument = InferSchemaType<typeof categorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Category: Model<CategoryDocument> =
  mongoose.models.Category ?? mongoose.model<CategoryDocument>("Category", categorySchema);
