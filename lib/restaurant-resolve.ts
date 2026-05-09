/**
 * Resolve restaurant slug from incoming Host (multi-tenant / multi-domain).
 * Prefer RESTAURANT_HOST_SLUG_MAP JSON, then RESTAURANT_SLUG, then host heuristics, default "a-wok".
 *
 * Example RESTAURANT_HOST_SLUG_MAP:
 * {"awok.onlineorders.store":"a-wok","onopokebar.onlineorders.store":"ono-poke-bar"}
 */
const BUILTIN_HOST_SLUG: Record<string, string> = {
  "awok.onlineorders.store": "a-wok",
  "www.awok.onlineorders.store": "a-wok",
  "onopokebar.onlineorders.store": "ono-poke-bar",
  "www.onopokebar.onlineorders.store": "ono-poke-bar",
};

export function resolveRestaurantSlugFromHost(hostHeader: string | null | undefined): string {
  const envDefault = process.env.RESTAURANT_SLUG?.trim();
  const raw = (hostHeader || "").trim().toLowerCase();
  const host = raw.split(",")[0]?.replace(/:\d+$/, "").trim() || "";

  if (!host) {
    return envDefault || "a-wok";
  }

  const mapJson = process.env.RESTAURANT_HOST_SLUG_MAP?.trim();
  if (mapJson) {
    try {
      const m = JSON.parse(mapJson) as Record<string, string>;
      const slug = m[host];
      if (slug && typeof slug === "string") return slug.trim();
    } catch {
      console.warn("[restaurant-resolve] RESTAURANT_HOST_SLUG_MAP is not valid JSON");
    }
  }

  if (BUILTIN_HOST_SLUG[host]) return BUILTIN_HOST_SLUG[host];

  if (host.endsWith(".onlineorders.store")) {
    const sub = host.replace(".onlineorders.store", "").split(".").filter(Boolean).pop();
    if (sub === "awok") return "a-wok";
    if (sub === "onopokebar" || sub === "ono") return "ono-poke-bar";
  }

  return envDefault || "a-wok";
}

export function resolveRestaurantSlugFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-host");
  const host = forwarded || req.headers.get("host");
  return resolveRestaurantSlugFromHost(host);
}

/** Server components / Route Handlers: pass host from `headers()` */
export function resolveRestaurantSlugFromHeadersGetter(getHeader: (name: string) => string | null): string {
  return resolveRestaurantSlugFromHost(getHeader("x-forwarded-host") || getHeader("host"));
}
