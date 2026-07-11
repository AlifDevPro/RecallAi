import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/route-auth";
import { getDueNowCounts, getSrsForecast } from "@/lib/srs/forecast";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const days = Math.min(14, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 7));

  const [forecast, dueNow] = await Promise.all([
    getSrsForecast(supabase, user.id, days),
    getDueNowCounts(supabase, user.id),
  ]);

  return NextResponse.json({
    dueNow,
    forecast,
    algorithm: "sm2",
  });
}
