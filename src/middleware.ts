import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, requiredRoleForPath, verifySession } from "@/lib/session-token";

export async function middleware(req: NextRequest) {
  const required = requiredRoleForPath(req.nextUrl.pathname);
  if (!required) return NextResponse.next();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session || session.role !== required) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/parent/:path*", "/student/:path*"] };
