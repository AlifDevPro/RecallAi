import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api/log-route-error";
import { getDashboardTopicsAndForecast } from "@/lib/dashboard/get-dashboard";
import { requireUser } from "@/lib/supabase/route-auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const data = await getDashboardTopicsAndForecast(auth.supabase, auth.user.id);
    return NextResponse.json(data);
  } catch (e) {
    logRouteError("GET /api/me/dashboard/decks", e, { userId: auth.user.id });
    const message = e instanceof Error ? e.message : "Failed to load decks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
