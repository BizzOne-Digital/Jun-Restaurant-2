import type { Types } from "mongoose";
import { User } from "@/models/User";

export type OrderContact = {
  name: string;
  email: string;
  phone: string;
};

export async function resolveOrderCustomerContact(order: {
  guestInfo?: { name: string; email: string; phone: string } | null;
  customer?: Types.ObjectId | null;
}): Promise<OrderContact | null> {
  if (order.guestInfo?.email) {
    return {
      name: order.guestInfo.name,
      email: order.guestInfo.email,
      phone: order.guestInfo.phone,
    };
  }
  if (order.customer) {
    const u = await User.findById(order.customer).lean();
    if (u?.email) {
      return {
        name: (u.name as string) || "Customer",
        email: u.email as string,
        phone: (u.phone as string) || "",
      };
    }
  }
  return null;
}
