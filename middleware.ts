import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getNextAuthSecret } from "@/lib/server-env";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: getNextAuthSecret() });
  if (!token || token.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
