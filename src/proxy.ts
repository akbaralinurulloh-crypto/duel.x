import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, isLocale, resolveLocale, splitLocalePrefix } from "@/lib/i18n/config";

// Does three jobs on each request:
//  1. language: /uz/x and /en/x set the language and redirect to /x; every other
//     page request is rewritten internally to /<lang>/x (URL stays the same);
//  2. refreshes the Supabase session cookies;
//  3. early redirect for /dashboard and /admin when signed out. This is only a
//     convenience: pages and actions still verify the user themselves.

const COOKIE_OPTIONS = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };

/** Paths that are not localized pages. */
function isPlainPath(path: string): boolean {
  return (
    path.startsWith("/api/") ||
    path.startsWith("/auth/") ||
    path === "/robots.txt" ||
    path === "/sitemap.xml"
  );
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;

  // /uz/... or /en/...: an explicit language link.
  const prefixed = splitLocalePrefix(path);
  if (prefixed && !isPlainPath(path)) {
    const url = request.nextUrl.clone();
    url.pathname = prefixed.rest;
    const redirect = NextResponse.redirect(url);
    redirect.cookies.set(LOCALE_COOKIE, prefixed.locale, COOKIE_OPTIONS);
    return redirect;
  }

  const locale = resolveLocale(cookieLocale, request.headers.get("accept-language"));
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/${locale}${path === "/" ? "" : path}`;

  const build = () => {
    const res = isPlainPath(path)
      ? NextResponse.next({ request })
      : NextResponse.rewrite(rewriteUrl, { request });
    if (!isLocale(cookieLocale)) res.cookies.set(LOCALE_COOKIE, locale, COOKIE_OPTIONS);
    return res;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = build();
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = build();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  const gated =
    path === "/dashboard" ||
    path.startsWith("/dashboard/") ||
    path === "/admin" ||
    path.startsWith("/admin/");

  if (!data.user && gated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(path)}`;
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
