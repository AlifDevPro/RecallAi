import { NextResponse } from "next/server";
import { hoursToMinutes, minutesToHours } from "@/lib/schedule/preferences-schema";
import { requireUser } from "@/lib/supabase/route-auth";
import { aggregateTopicStats } from "@/lib/topics/aggregate-topic-stats";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data: plan } = await supabase
    .from("study_plans")
    .select("goal, minutes_per_day, hours_per_day, deadline")
    .eq("user_id", user.id)
    .single();

  const hoursPerDay =
    plan?.hours_per_day != null
      ? Number(plan.hours_per_day)
      : minutesToHours(plan?.minutes_per_day ?? 30);

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
      target: `${hoursPerDay} h/day study`,
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

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.goal === "string") {
    updates.goal = body.goal.trim();
  }
  if (typeof body.hoursPerDay === "number" && body.hoursPerDay > 0) {
    updates.hours_per_day = body.hoursPerDay;
    updates.minutes_per_day = hoursToMinutes(body.hoursPerDay);
  }
  if (typeof body.deadline === "string") {
    updates.deadline = body.deadline || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { error } = await supabase.from("study_plans").update(updates).eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
