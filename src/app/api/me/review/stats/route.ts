import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReviewStats } from "@/lib/review/get-review-queue";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topic = new URL(request.url).searchParams.get("topic") ?? undefined;

  try {
    const stats = await getReviewStats(supabase, user.id, topic);
    return NextResponse.json(stats);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load review stats";
    console.error("review stats fallback:", message);
    return NextResponse.json({ totalDue: 0 });
  }
}
