import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/route-auth";
import {
  buildActivityGrid,
  computeReviewStreak,
  localDateKey,
  reviewEventsToDateKeys,
} from "@/lib/review/streak";
import { aggregateTopicStats } from "@/lib/topics/aggregate-topic-stats";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: profile } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", user.id)
    .single();

  const accountCreatedAt = profile?.created_at ?? new Date().toISOString();
  const accountStart = new Date(accountCreatedAt);
  accountStart.setHours(0, 0, 0, 0);

  const { data: reviews } = await supabase
    .from("review_events")
    .select("reviewed_at, cards_reviewed")
    .eq("user_id", user.id)
    .gte("reviewed_at", since.toISOString())
    .order("reviewed_at", { ascending: false });

  const filteredReviews = (reviews ?? []).filter((r) => r.reviewed_at >= accountCreatedAt);

  const byDay = new Map<string, number>();
  for (const r of filteredReviews) {
    const d = new Date(r.reviewed_at);
    const day = Number.isNaN(d.getTime()) ? r.reviewed_at.slice(0, 10) : localDateKey(d);
    byDay.set(day, (byDay.get(day) ?? 0) + r.cards_reviewed);
  }

  const reviewDateSet = reviewEventsToDateKeys(filteredReviews);
  const streak = computeReviewStreak(reviewDateSet);
  const totalCards = filteredReviews.reduce((s, r) => s + r.cards_reviewed, 0);

  const topics = await aggregateTopicStats(supabase, user.id);
  const avgMastery =
    topics.length > 0
      ? Math.round(topics.reduce((s, t) => s + t.mastery, 0) / topics.length)
      : 0;
  const totalDue = topics.reduce((s, t) => s + t.due, 0);

  const topicRows = topics.map((t) => ({
    name: t.name,
    slug: t.slug,
    mastery: t.mastery,
    trend: t.trend,
    due: t.due,
    cards: t.cards,
  }));

  const weaknesses = [...topics]
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 8)
    .map((t) => ({
      name: t.name,
      mastery: t.mastery,
      due: t.due,
      gap: Math.max(0, 100 - t.mastery),
      trend: t.trend,
    }));

  const { activityGrid } = buildActivityGrid(filteredReviews, 30, accountStart);
  const activityDays: { date: string; weekday: string; count: number; level: string }[] = [];
  const activityStart = new Date();
  activityStart.setDate(activityStart.getDate() - 29);
  activityStart.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const d = new Date(activityStart);
    d.setDate(d.getDate() + i);
    const key = localDateKey(d);
    activityDays.push({
      date: key,
      weekday: WEEKDAYS[d.getDay()],
      count: byDay.get(key) ?? 0,
      level: activityGrid[i] ?? "empty",
    });
  }

  const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = localDateKey(d);
    return {
      day: `${WEEKDAYS[d.getDay()]} ${d.getDate()}`,
      cards: byDay.get(key) ?? 0,
    };
  });

  const sessions = filteredReviews.slice(0, 12).map((r) => ({
    date: new Date(r.reviewed_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    type: "Review",
    cards: r.cards_reviewed,
    duration: `${Math.max(1, Math.round(r.cards_reviewed * 0.7))}m`,
  }));

  const weakest = weaknesses[0];
  const insight = weakest
    ? `You reviewed ${totalCards} cards in 30 days. ${weakest.name} is your weakest area at ${weakest.mastery}% — ${weakest.due} cards due.`
    : totalCards > 0
      ? `You reviewed ${totalCards} cards in the last 30 days. Keep your ${streak}-day streak going.`
      : "Complete your first review session to start tracking progress here.";

  return NextResponse.json({
    avgMastery,
    totalReviews: totalCards,
    totalDue,
    streak,
    topics: topicRows,
    weaknesses,
    sessions,
    activityDays,
    weeklyTrend,
    insight,
  });
}
