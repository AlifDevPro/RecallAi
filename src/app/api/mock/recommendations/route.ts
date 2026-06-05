import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aggregateTopicStats } from "@/lib/topics/aggregate-topic-stats";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topics = await aggregateTopicStats(supabase, user.id);
  const weak = [...topics]
    .filter((t) => t.status === "active")
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3);

  return NextResponse.json({
    recommendations: weak.map((t) => ({
      topic: t.name,
      slug: t.slug,
      reason: `${t.due} cards due · ${t.mastery}% mastery`,
    })),
  });
}
