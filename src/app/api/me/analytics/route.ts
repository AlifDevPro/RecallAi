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
      if (days.has(cursor.toISOString().slice(0, 10))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    } else break;
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

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: reviews } = await supabase
    .from("review_events")
    .select("reviewed_at, cards_reviewed")
    .eq("user_id", user.id)
    .gte("reviewed_at", since.toISOString())
    .order("reviewed_at", { ascending: false });

  const byDay = new Map<string, number>();
  for (const r of reviews ?? []) {
    const day = r.reviewed_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + r.cards_reviewed);
  }

  const daily = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cards]) => ({ date, cards }));

  const totalCards = (reviews ?? []).reduce((s, r) => s + r.cards_reviewed, 0);
  const streak = computeStreak((reviews ?? []).map((r) => r.reviewed_at));

  const topics = await aggregateTopicStats(supabase, user.id);
  const avgMastery =
    topics.length > 0
      ? Math.round(topics.reduce((s, t) => s + t.mastery, 0) / topics.length)
      : 0;

  const topicRows = topics.map((t) => ({
    name: t.name,
    mastery: t.mastery,
    trend: t.trend,
  }));

  const weaknesses = topics
    .filter((t) => t.mastery < 70)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 6)
    .map((t) => ({
      concept: t.name,
      topic: t.name,
      wrongRate: 100 - t.mastery,
    }));

  const sessions = (reviews ?? []).slice(0, 10).map((r) => ({
    date: new Date(r.reviewed_at).toLocaleDateString(),
    type: "Review",
    cards: r.cards_reviewed,
    accuracy: avgMastery,
    duration: `${Math.max(1, Math.round(r.cards_reviewed * 0.7))}m`,
  }));

  const heatmapData = topics.slice(0, 6).map((t) => {
    const base = t.mastery / 100;
    return Array.from({ length: 30 }, (_, i) => {
      const dayKey = new Date();
      dayKey.setDate(dayKey.getDate() - (29 - i));
      const cards = byDay.get(dayKey.toISOString().slice(0, 10)) ?? 0;
      return cards > 0 ? Math.min(1, base + cards * 0.02) : base * 0.3;
    });
  });

  return NextResponse.json({
    daily,
    totalCards,
    totalReviews: totalCards,
    streak,
    avgMastery,
    topics: topicRows,
    weaknesses,
    sessions,
    heatmapData,
    insight: `You reviewed ${totalCards} cards in the last 30 days across ${topics.length} topics.`,
  });
}
