import { z } from "zod";

export const guestInfoSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(30),
});

export const checkoutBodySchema = z
  .object({
    items: z
      .array(
        z.object({
          menuItemId: z.string().min(1),
          quantity: z.number().int().min(1).max(99),
          notes: z.string().max(500).optional(),
          selectedOptions: z
            .array(
              z.object({
                name: z.string().min(1).max(80),
                value: z.string().min(1).max(120),
              })
            )
            .optional(),
        })
      )
      .min(1),
    fulfillmentType: z.literal("pickup"),
    /**
     * "ASAP" — customer wants the order as soon as it's ready.
     * "SCHEDULED" — customer selected a specific pickup time (pickupTime must be provided).
     */
    pickupType: z.enum(["ASAP", "SCHEDULED"]),
    /** Required when pickupType is "SCHEDULED"; ignored for "ASAP". */
    pickupTime: z.string().max(120).optional(),
    customerNotes: z.string().max(2000).optional(),
    tipCents: z.number().int().min(0).max(500_00),
    guestInfo: guestInfoSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.pickupType === "SCHEDULED" && !data.pickupTime?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pickupTime"],
        message: "Please select a pickup time.",
      });
    }
  });

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
