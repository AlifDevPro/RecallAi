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

  const { data: plan } = await supabase
    .from("study_plans")
    .select("goal, minutes_per_day, deadline")
    .eq("user_id", user.id)
    .single();

  const topics = await aggregateTopicStats(supabase, user.id);
  const avgMastery =
    topics.length > 0
      ? Math.round(topics.reduce((s, t) => s + t.mastery, 0) / topics.length)
      : 0;

  const goals = [
    {
      id: "primary",
      title: plan?.goal || "Complete your study plan",
      progress: avgMastery,
      target: plan?.minutes_per_day ? `${plan.minutes_per_day} min/day` : "Daily review",
      deadline: plan?.deadline,
    },
    ...topics.slice(0, 3).map((t) => ({
      id: t.slug,
      title: `Master ${t.name}`,
      progress: t.mastery,
      target: "80% mastery",
      deadline: null,
    })),
  ];

  return NextResponse.json({ goals });
}
