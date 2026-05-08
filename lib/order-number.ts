import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("0123456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);

export function generateOrderNumber(): string {
  return `AWK-${nanoid()}`;
}
