import { NextResponse } from "next/server";
import { getDashboardForecast } from "@/lib/dashboard/get-dashboard";
import { requireUser } from "@/lib/supabase/route-auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const forecast = await getDashboardForecast(auth.supabase, auth.user.id);
    return NextResponse.json({ forecast });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load forecast";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
