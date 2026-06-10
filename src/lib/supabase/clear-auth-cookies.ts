import type { NextResponse } from "next/server";

export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; status?: number };
  return (
    e.code === "refresh_token_not_found" ||
    e.message?.includes("Refresh Token") === true ||
    e.message?.includes("refresh_token_not_found") === true
  );
}

/** Clear Supabase auth cookies from a Next.js response (middleware or route). */
export function clearSupabaseAuthCookies(
  response: NextResponse,
  cookieNames: string[]
): void {
  for (const name of cookieNames) {
    if (name.startsWith("sb-")) {
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    }
  }
}
