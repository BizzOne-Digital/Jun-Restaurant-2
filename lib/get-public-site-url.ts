/**
 * Public site base URL for Stripe redirects and email asset resolution.
 * Prefer forwarded host (Vercel custom domain) over a stale NEXT_PUBLIC_SITE_URL.
 *
 * In production, if the request would resolve to localhost but NEXT_PUBLIC_SITE_URL
 * is a non-local HTTPS URL, use the env URL so Stripe success_url matches the live store
 * (success-page → /api/orders/lookup → payment sync → emails) without relying on webhooks.
 */
function isLocalHostname(host: string): boolean {
  const h = host.split(":")[0]?.trim().toLowerCase() || "";
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".local") ||
    h.includes("localhost.")
  );
}

function isUsablePublicSiteUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return Boolean(u.hostname) && !isLocalHostname(u.hostname);
  } catch {
    return false;
  }
}

export function getPublicSiteUrlFromRequest(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim() || "";
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0]?.trim() || "https";
  const host =
    (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0]?.trim() || "";

  let fromRequest = "";
  if (host && !isLocalHostname(host)) {
    fromRequest = `${proto}://${host}`.replace(/\/$/, "");
  }

  let candidate = fromRequest || fromEnv || "http://localhost:3000";
  let source: "request_host" | "next_public_site_url" | "default_localhost" | "production_public_env_fallback" =
    fromRequest ? "request_host" : fromEnv ? "next_public_site_url" : "default_localhost";

  if (process.env.NODE_ENV === "production" && fromEnv && isUsablePublicSiteUrl(fromEnv)) {
    if (!isUsablePublicSiteUrl(candidate)) {
      candidate = fromEnv;
      source = "production_public_env_fallback";
    }
  }

  if (process.env.ORDER_EMAIL_TRACE_LOG === "1") {
    console.info("[email-trace] getPublicSiteUrl:resolved", {
      result: candidate,
      source,
      requestHost: host || "(empty)",
      nextPublicSiteUrlSet: Boolean(fromEnv),
    });
  }

  return candidate;
}
