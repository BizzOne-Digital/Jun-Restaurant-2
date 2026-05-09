/**
 * Join site origin with a path (no double slashes).
 * `siteOrigin` should have no trailing slash.
 */
export function joinOriginAndPath(siteOrigin: string, path: string): string {
  const origin = siteOrigin.replace(/\/+$/, "");
  if (!path) return origin;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}

/**
 * Resolves a logo reference to a URL string for templating.
 * Does not enforce “email-safe” rules — use `emailSafeLogoUrl` for `<img src>`.
 */
export function resolveEmailLogoUrl(logoPathOrUrl: string | undefined | null, siteOrigin: string): string | null {
  const raw = (logoPathOrUrl ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = siteOrigin.replace(/\/+$/, "");
  if (!origin) return null;
  return joinOriginAndPath(origin, raw);
}

/** Gmail/Outlook-safe: only https, and never localhost (broken in inboxes). */
export function emailSafeLogoUrl(logoPathOrUrl: string | undefined | null, siteOrigin: string): string | null {
  const u = resolveEmailLogoUrl(logoPathOrUrl, siteOrigin);
  if (!u) return null;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return null;
    return u;
  } catch {
    return null;
  }
}
