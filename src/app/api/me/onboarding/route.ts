import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api/log-route-error";
import { onboardingSchema } from "@/lib/auth/schemas";
import { hoursToMinutes } from "@/lib/schedule/preferences-schema";
import { requireUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, goal, goalTemplate, level, hoursPerDay, days, deadline, skip } =
    parsed.data;

  const displayName = name || user.user_metadata?.full_name || "Student";
  const planGoal = skip ? "Get started with spaced repetition" : goal;
  const planLevel = skip ? "beginner" : level;
  const planHours = skip ? 0.5 : hoursPerDay;
  const planMinutes = hoursToMinutes(planHours);
  const planDays = skip ? [1, 3, 5] : days;
  const scheduleNarrative = skip
    ? ""
    : `Goal: ${goal}. Study ${planHours}h/day on selected days. Level: ${level}.${deadline ? ` Deadline: ${deadline}.` : ""}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    logRouteError("POST /api/me/onboarding", profileError, { userId: user.id });
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await supabase.auth.updateUser({
    data: { full_name: displayName },
  });

  const { error: planError } = await supabase.from("study_plans").upsert({
    user_id: user.id,
    goal: planGoal,
    goal_template: goalTemplate ?? "",
    level: planLevel,
    hours_per_day: planHours,
    minutes_per_day: planMinutes,
    study_days: planDays,
    deadline: deadline || null,
    schedule_narrative: scheduleNarrative,
  });

  if (planError) {
    logRouteError("POST /api/me/onboarding", planError, { userId: user.id });
    return NextResponse.json({ error: planError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
