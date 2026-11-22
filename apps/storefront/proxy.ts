import { NextResponse, type NextRequest } from "next/server";
import { RECIPES_LIVE } from "@/lib/features";
import { LANG_COOKIE, splitLangPath } from "@/lib/i18n/lang";

/**
 * Storefront languages (owner decision 2026-11-15, memory: storefront-bilingual):
 * - "/…" is Bangla: served from app/[lang] with lang = "bn" (an internal rewrite; the URL stays).
 * - "/en/…" is English.
 * - "/bn/…" is never a public address: it redirects to the unprefixed URL.
 * - A visitor who chose English (cookie) and follows a plain link stays in English.
 * - Bangla is the default on every device (owner, 2026-11-22): a first visit with no choice yet
 *   stays on Bangla whatever the browser language; only the EN / বাং toggle switches.
 * Bots and non-GET requests (server actions) are never redirected.
 */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|lighthouse/i;

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const { pathname } = url;

  if (pathname === "/bn" || pathname.startsWith("/bn/")) {
    const to = url.clone();
    to.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(to, 308);
  }

  const { lang, path } = splitLangPath(pathname);
  // Recipes are hidden for launch (lib/features): a real 404 before any loading screen streams.
  if (!RECIPES_LIVE && (path === "/recipes" || path.startsWith("/recipes/"))) {
    const to = url.clone();
    to.pathname = `/${lang}/recipes-hidden`;
    return NextResponse.rewrite(to);
  }
  if (lang === "en") return NextResponse.next();

  const navigating = request.method === "GET" || request.method === "HEAD";
  const isBot = BOT.test(request.headers.get("user-agent") ?? "");
  if (navigating && !isBot) {
    if (request.cookies.get(LANG_COOKIE)?.value === "en") {
      const to = url.clone();
      to.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
      return NextResponse.redirect(to, 307);
    }
  }

  const to = url.clone();
  to.pathname = pathname === "/" ? "/bn" : `/bn${pathname}`;
  return NextResponse.rewrite(to);
}

export const config = {
  // Pages only: not the API, Next internals, files with an extension (images, robots.txt,
  // sitemap.xml, llms.txt, favicon.ico).
  matcher: ["/((?!api/|_next/|.*\\.[a-zA-Z0-9]+$).*)"],
};
