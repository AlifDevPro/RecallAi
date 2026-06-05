import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aggregateTopicStats } from "@/lib/topics/aggregate-topic-stats";

function computeStreak(reviewDates: string[]): number {
  if (!reviewDates.length) return 0;
  const days = new Set(reviewDates.map((d) => d.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1);
      const yesterday = cursor.toISOString().slice(0, 10);
      if (days.has(yesterday)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return streak;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, bio, avatar_url, plan, created_at")
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
  const streak = computeStreak((reviews ?? []).map((r) => r.reviewed_at));

  const byDay = new Map<string, number>();
  for (const r of reviews ?? []) {
    const day = r.reviewed_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + r.cards_reviewed);
  }
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const activity = weekDays.map((day, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { day, v: byDay.get(key) ?? 0 };
  });

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "Learner";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return NextResponse.json({
    profile: {
      displayName,
      email: profile?.email ?? user.email,
      bio: profile?.bio ?? "",
      avatarUrl: profile?.avatar_url,
      plan: profile?.plan ?? "free",
      joinedAt: profile?.created_at,
      initials,
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.displayName === "string") {
    updates.display_name = body.displayName.trim();
  }
  if (typeof body.bio === "string") {
    updates.bio = body.bio.slice(0, 280);
  }
  if (typeof body.avatarUrl === "string") {
    updates.avatar_url = body.avatarUrl;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
