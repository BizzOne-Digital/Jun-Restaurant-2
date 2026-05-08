/**
 * Centralized env resolution so `next dev` works without a committed `.env`.
 * Production must set real secrets in the host environment (never rely on fallbacks).
 */
const DEV_NEXTAUTH_FALLBACK =
  "development-only-nextauth-secret-min-32-chars-do-not-use-in-prod";
const DEV_MONGO_FALLBACK = "mongodb://127.0.0.1:27017/awok";

export function getNextAuthSecret(): string | undefined {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV !== "production") return DEV_NEXTAUTH_FALLBACK;
  return undefined;
}

export function getMongoUri(): string | undefined {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  if (process.env.NODE_ENV === "development") return DEV_MONGO_FALLBACK;
  return undefined;
}
