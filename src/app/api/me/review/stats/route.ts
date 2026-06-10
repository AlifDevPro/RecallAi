import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api/log-route-error";
import { getReviewStats } from "@/lib/review/get-review-queue";
import { requireUser } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const topic = new URL(request.url).searchParams.get("topic") ?? undefined;

  try {
    const stats = await getReviewStats(auth.supabase, auth.user.id, topic);
    return NextResponse.json(stats);
  } catch (e) {
    logRouteError("GET /api/me/review/stats", e, { userId: auth.user.id, topic });
    const message = e instanceof Error ? e.message : "Failed to load review stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
