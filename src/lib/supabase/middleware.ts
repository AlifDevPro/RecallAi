import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./env";
import { clearSupabaseAuthCookies, isInvalidRefreshTokenError } from "./clear-auth-cookies";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/schedule",
  "/review",
  "/topics",
  "/quiz",
  "/mock",
  "/analytics",
  "/leaderboard",
  "/goals",
  "/tutor",
  "/settings",
  "/profile",
  "/notifications",
  "/billing",
  "/admin",
  "/onboarding",
];

const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const cookieNames = request.cookies.getAll().map((c) => c.name);

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error && isInvalidRefreshTokenError(error)) {
      clearSupabaseAuthCookies(supabaseResponse, cookieNames);
    } else {
      user = data.user;
    }
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      clearSupabaseAuthCookies(supabaseResponse, cookieNames);
    } else {
      throw error;
    }
  }

  const pathname = request.nextUrl.pathname;

  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && isProtected(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .single();

    const onboarded = !!profile?.onboarding_completed_at;

    if (!onboarded && pathname !== "/onboarding" && pathname !== "/onboarding/") {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    if (onboarded && (pathname === "/onboarding" || pathname === "/onboarding/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
