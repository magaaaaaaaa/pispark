import { NextResponse, type NextRequest } from "next/server";
import { OWNER_COOKIE, verifySessionToken } from "@/lib/admin/session";

/** Keeps the owner area private. Server actions and pages re-check the session themselves. */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/owner/login") return NextResponse.next();
  const token = request.cookies.get(OWNER_COOKIE)?.value;
  if (verifySessionToken(token, process.env.SESSION_SECRET ?? "", new Date())) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/owner/login", request.url));
}

export const config = { matcher: ["/owner", "/owner/:path*"] };
