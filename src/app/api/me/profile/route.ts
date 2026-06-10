import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/route-auth";
import { aggregateTopicStats } from "@/lib/topics/aggregate-topic-stats";
import { mergeExtendedSettings, pickExtendedSettings } from "@/lib/profile/extended";
import { computeReviewStreak, localDateKey } from "@/lib/review/streak";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, bio, avatar_url, plan, created_at, settings")
    .eq("id", user.id)
    .single();

  const topics = await aggregateTopicStats(supabase, user.id);
  const cardsMastered = topics.reduce((s, t) => s + t.cards, 0);
  const avgMastery =
    topics.length > 0
      ? Math.round(topics.reduce((s, t) => s + t.mastery, 0) / topics.length)
      : 0;

  const since = new Date();
  since.setDate(since.getDate() - 90);
  const { data: reviews } = await supabase
    .from("review_events")
    .select("reviewed_at, cards_reviewed")
    .eq("user_id", user.id)
    .gte("reviewed_at", since.toISOString())
    .order("reviewed_at", { ascending: false });

  const totalReviews = (reviews ?? []).reduce((s, r) => s + r.cards_reviewed, 0);
  const reviewDateSet = new Set<string>();
  const byDay = new Map<string, number>();
  for (const r of reviews ?? []) {
    const d = new Date(r.reviewed_at);
    const day = Number.isNaN(d.getTime()) ? r.reviewed_at.slice(0, 10) : localDateKey(d);
    reviewDateSet.add(day);
    byDay.set(day, (byDay.get(day) ?? 0) + r.cards_reviewed);
  }
  const streak = computeReviewStreak(reviewDateSet);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const activity = weekDays.map((day, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = localDateKey(d);
    return { day, v: byDay.get(key) ?? 0 };
  });

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "Learner";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const extended = pickExtendedSettings(
    profile?.settings as Record<string, unknown> | undefined
  );

  return NextResponse.json({
    profile: {
      displayName,
      email: profile?.email ?? user.email,
      bio: profile?.bio ?? "",
      avatarUrl: profile?.avatar_url,
      plan: profile?.plan ?? "free",
      joinedAt: profile?.created_at,
      initials,
      ...extended,
    },
    stats: {
      streak,
      cardsMastered,
      avgMastery,
      totalReviews,
      goalsHit: topics.filter((t) => t.mastery >= 80).length,
    },
    activity,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  const extendedPatch: Record<string, unknown> = {};

  if (typeof body.displayName === "string") {
    updates.display_name = body.displayName.trim();
  }
  if (typeof body.bio === "string") {
    updates.bio = body.bio.slice(0, 280);
  }
  if (typeof body.avatarUrl === "string") {
    updates.avatar_url = body.avatarUrl;
  }
  if (body.avatarUrl === null) {
    updates.avatar_url = null;
  }

  const extendedKeys = [
    "skillLevel",
    "timezone",
    "location",
    "primaryGoal",
    "website",
    "github",
    "linkedin",
  ] as const;
  for (const key of extendedKeys) {
    if (key in body) {
      extendedPatch[key] = typeof body[key] === "string" ? body[key].trim() : body[key];
    }
  }

  if (Object.keys(updates).length === 0 && Object.keys(extendedPatch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  if (Object.keys(extendedPatch).length > 0) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", user.id)
      .single();
    updates.settings = mergeExtendedSettings(
      existing?.settings as Record<string, unknown> | undefined,
      extendedPatch
    );
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
