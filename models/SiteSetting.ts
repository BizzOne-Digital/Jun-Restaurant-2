import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const siteSettingSchema = new Schema(
  {
    /** Single-tenant key; one document per deployment. */
    key: { type: String, required: true, unique: true, default: "default" },
    restaurantName: { type: String, required: true, trim: true, default: "A Wok" },
    /** Public / kitchen order inbox used in email context when env is unset. */
    email: { type: String, default: "", trim: true },
    /** Logo path or absolute URL (same semantics as email templates). */
    logo: { type: String, default: "", trim: true },
    pickupPrepareTimeMinutes: { type: Number, default: 20, min: 1, max: 240 },
  },
  { timestamps: true }
);

export type SiteSettingDocument = InferSchemaType<typeof siteSettingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SiteSetting: Model<SiteSettingDocument> =
  mongoose.models.SiteSetting ?? mongoose.model<SiteSettingDocument>("SiteSetting", siteSettingSchema);
