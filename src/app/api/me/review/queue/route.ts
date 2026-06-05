import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReviewQueue } from "@/lib/review/get-review-queue";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const mode = searchParams.get("mode") === "preview" ? "preview" : "due";
  const topic = searchParams.get("topic") ?? undefined;

  try {
    const result = await getReviewQueue(supabase, user.id, {
      limit,
      mode,
      topicSlug: topic,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load review queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
