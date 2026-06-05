import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/auth/schemas";
import { seedUserDashboardData } from "@/lib/onboarding/seed-user-data";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const { name, goal, goalTemplate, level, minutesPerDay, days, deadline, skip } =
    parsed.data;

  const displayName = name || user.user_metadata?.full_name || "Student";
  const planGoal = skip ? "Get started with spaced repetition" : goal;
  const planLevel = skip ? "beginner" : level;
  const planMinutes = skip ? 20 : minutesPerDay;
  const planDays = skip ? [1, 3, 5] : days;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
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
    minutes_per_day: planMinutes,
    study_days: planDays,
    deadline: deadline || null,
  });

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 });
  }

  try {
    await seedUserDashboardData(supabase, user.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Seed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
