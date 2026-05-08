import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const addressSchema = new Schema(
  {
    label: { type: String },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    addresses: { type: [addressSchema], default: [] },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);
