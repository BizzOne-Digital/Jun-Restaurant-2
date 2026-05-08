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
    pickupTime: z.string().max(120).optional(),
    customerNotes: z.string().max(2000).optional(),
    tipCents: z.number().int().min(0).max(500_00),
    guestInfo: guestInfoSchema.optional(),
  });

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
