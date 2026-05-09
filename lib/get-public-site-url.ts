/**
 * Public site base URL for Stripe redirects and email asset resolution.
 * Prefer forwarded host (Vercel custom domain) over a stale NEXT_PUBLIC_SITE_URL.
 */
export function getPublicSiteUrlFromRequest(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim();
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0]?.trim() || "https";
  const host =
    (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0]?.trim() || "";

  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".local") ||
    host.includes("localhost:");

  if (host && !isLocal) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  if (fromEnv) return fromEnv;

  return "http://localhost:3000";
}
