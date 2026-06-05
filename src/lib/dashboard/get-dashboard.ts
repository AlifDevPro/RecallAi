import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityLevel, DashboardPayload, DashboardTopic } from "@/lib/data/dashboard";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function computeTrend(current: number, prior: number | null): DashboardTopic["trend"] {
  if (prior == null) return "stable";
  const diff = current - prior;
  if (diff > 2) return "up";
  if (diff < -2) return "down";
  return "stable";
}

function computeStatus(mastery: number, due: number, totalCards: number): DashboardTopic["status"] {
  if (mastery >= 90 && due === 0) return "ahead";
  if (mastery < 60 || due > totalCards * 0.15) return "at-risk";
  return "on-track";
}

function countToLevel(count: number): ActivityLevel {
  if (count === 0) return "empty";
  if (count >= 12) return "high";
  if (count >= 5) return "medium";
  return "low";
}

function computeStreak(reviewDates: Set<string>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const d = new Date(today);
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (!reviewDates.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export async function getDashboard(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardPayload> {
  const activityStart = new Date();
  activityStart.setDate(activityStart.getDate() - 89);
  activityStart.setHours(0, 0, 0, 0);

  const [
    { data: profile },
    { data: topics },
    { data: insightRow },
    { data: reviews },
  ] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).single(),
    supabase
      .from("topics")
      .select("id, name, slug")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("name"),
    supabase.from("user_insights").select("body").eq("user_id", userId).single(),
    supabase
      .from("review_events")
      .select("reviewed_at, cards_reviewed")
      .eq("user_id", userId)
      .gte("reviewed_at", activityStart.toISOString())
      .order("reviewed_at"),
  ]);

  const displayName = profile?.display_name?.split(" ")[0] ?? "there";
  const topicList = topics ?? [];
  const topicIds = topicList.map((t) => t.id);

  let cards: { id: string; topic_id: string }[] = [];
  if (topicIds.length > 0) {
    const { data } = await supabase
      .from("cards")
      .select("id, topic_id")
      .eq("user_id", userId)
      .in("topic_id", topicIds);
    cards = data ?? [];
  }

  const cardIds = cards.map((c) => c.id);
  const now = new Date().toISOString();

  let scheduling: {
    card_id: string;
    due_at: string;
    mastery: number;
    mastery_7d_ago: number | null;
  }[] = [];

  if (cardIds.length > 0) {
    const { data } = await supabase
      .from("card_scheduling")
      .select("card_id, due_at, mastery, mastery_7d_ago")
      .eq("user_id", userId)
      .in("card_id", cardIds);
    scheduling = (data ?? []).map((s) => ({
      ...s,
      mastery: Number(s.mastery),
      mastery_7d_ago: s.mastery_7d_ago != null ? Number(s.mastery_7d_ago) : null,
    }));
  }

  const schedByCard = new Map(scheduling.map((s) => [s.card_id, s]));

  const dashboardTopics: DashboardTopic[] = topicList.map((topic) => {
    const topicCards = cards.filter((c) => c.topic_id === topic.id);
    const totalCards = topicCards.length;
    const topicSched = topicCards
      .map((c) => schedByCard.get(c.id))
      .filter(Boolean) as typeof scheduling;

    const due = topicSched.filter((s) => s.due_at <= now).length;
    const mastery =
      topicSched.length > 0
        ? Math.round(topicSched.reduce((sum, s) => sum + s.mastery, 0) / topicSched.length)
        : 0;
    const prior =
      topicSched.length > 0
        ? Math.round(
            topicSched.reduce((sum, s) => sum + (s.mastery_7d_ago ?? s.mastery), 0) /
              topicSched.length
          )
        : mastery;

    return {
      name: topic.name,
      slug: topic.slug,
      mastery,
      trend: computeTrend(mastery, prior),
      cards: totalCards,
      due,
      status: computeStatus(mastery, due, totalCards || 1),
    };
  });

  const forecast: { day: string; count: number }[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dayEnd = new Date(d);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = scheduling.filter(
      (s) => s.due_at >= d.toISOString() && s.due_at < dayEnd.toISOString()
    ).length;
    const label = `${WEEKDAYS[d.getDay()]} ${d.getDate()}`;
    forecast.push({ day: label, count });
  }

  const countsByDay = new Map<string, number>();
  const reviewDateSet = new Set<string>();

  for (const r of reviews ?? []) {
    const day = r.reviewed_at.slice(0, 10);
    reviewDateSet.add(day);
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + r.cards_reviewed);
  }

  const activityGrid: ActivityLevel[] = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(activityStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    activityGrid.push(countToLevel(countsByDay.get(key) ?? 0));
  }

  const streakDays = computeStreak(reviewDateSet);
  const minutesPerCard = 0.7;

  const totalDue = dashboardTopics.reduce((s, t) => s + t.due, 0);
  const weakest = [...dashboardTopics].sort((a, b) => a.mastery - b.mastery)[0];
  const defaultInsight = weakest
    ? `Your ${weakest.name} deck is at ${weakest.mastery}% mastery with ${weakest.due} cards due. You have ${totalDue} cards due today — start a focused review session.`
    : "Create your first topic to start building your retention streak.";

  return {
    displayName,
    topics: dashboardTopics,
    forecast,
    activityGrid,
    streakDays: streakDays || 0,
    insight: insightRow?.body ?? defaultInsight,
    minutesPerCard,
  };
}
