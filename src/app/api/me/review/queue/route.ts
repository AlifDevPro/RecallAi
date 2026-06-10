import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api/log-route-error";
import { getReviewQueue } from "@/lib/review/get-review-queue";
import { requireUser } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const mode = searchParams.get("mode") === "preview" ? "preview" : "due";
  const topic = searchParams.get("topic") ?? undefined;

  try {
    const result = await getReviewQueue(auth.supabase, auth.user.id, {
      limit,
      mode,
      topicSlug: topic,
    });
    return NextResponse.json(result);
  } catch (e) {
    logRouteError("GET /api/me/review/queue", e, { userId: auth.user.id });
    const message = e instanceof Error ? e.message : "Failed to load review queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
