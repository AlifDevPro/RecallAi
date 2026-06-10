import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api/log-route-error";
import { pickExtendedSettings } from "@/lib/profile/extended";
import {
  hoursToMinutes,
  minutesToHours,
  schedulePreferencesSchema,
} from "@/lib/schedule/preferences-schema";
import { requireUser } from "@/lib/supabase/route-auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { data: plan } = await auth.supabase
    .from("study_plans")
    .select(
      "goal, level, hours_per_day, minutes_per_day, study_days, deadline, schedule_narrative"
    )
    .eq("user_id", auth.user.id)
    .single();

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("settings")
    .eq("id", auth.user.id)
    .single();

  const extended = pickExtendedSettings(
    profile?.settings as Record<string, unknown> | undefined
  );

  const hoursPerDay =
    plan?.hours_per_day != null
      ? Number(plan.hours_per_day)
      : minutesToHours(plan?.minutes_per_day ?? 30);

  return NextResponse.json({
    hoursPerDay,
    scheduleNarrative: plan?.schedule_narrative ?? "",
    goal: plan?.goal ?? "",
    level: plan?.level ?? "beginner",
    studyDays: plan?.study_days ?? [1, 2, 3, 4, 5],
    deadline: plan?.deadline ?? null,
    timezone: extended.timezone ?? null,
  });
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schedulePreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  const data = parsed.data;

  if (data.hoursPerDay != null) {
    updates.hours_per_day = data.hoursPerDay;
    updates.minutes_per_day = hoursToMinutes(data.hoursPerDay);
  }
  if (data.scheduleNarrative != null) {
    updates.schedule_narrative = data.scheduleNarrative;
  }
  if (data.goal != null) updates.goal = data.goal;
  if (data.level != null) updates.level = data.level;
  if (data.studyDays != null) updates.study_days = data.studyDays;
  if (data.deadline !== undefined) updates.deadline = data.deadline;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: existing } = await auth.supabase
    .from("study_plans")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const { error } = existing
    ? await auth.supabase.from("study_plans").update(updates).eq("user_id", auth.user.id)
    : await auth.supabase.from("study_plans").insert({
        user_id: auth.user.id,
        goal: (data.goal as string | undefined) ?? "",
        level: data.level ?? "beginner",
        minutes_per_day: data.hoursPerDay != null ? hoursToMinutes(data.hoursPerDay) : 30,
        hours_per_day: data.hoursPerDay ?? 0.5,
        study_days: data.studyDays ?? [1, 2, 3, 4, 5],
        schedule_narrative: data.scheduleNarrative ?? "",
        ...updates,
      });

  if (error) {
    logRouteError("PUT /api/me/schedule/preferences", error, { userId: auth.user.id });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
