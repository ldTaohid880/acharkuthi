import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Fast, optimistic check: no cookie -> login. The real role check is requireAdmin().
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // robots.txt is public so crawlers read "Disallow: /" instead of being sent to /login.
  matcher: [
    "/((?!login|api/auth|api/webhooks|_next|favicon.ico|icon.png|apple-icon.png|robots.txt).*)",
  ],
};
