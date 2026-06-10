import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityLevel, DashboardPayload, DashboardTopic } from "@/lib/data/dashboard";
import { ensureDemoDataPurged } from "@/lib/onboarding/purge-demo-data";
import { getReviewStats } from "@/lib/review/get-review-queue";
import {
  buildActivityGrid,
  computeReviewStreak,
  reviewEventsToDateKeys,
} from "@/lib/review/streak";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MINUTES_PER_CARD = 0.7;

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

type TopicRow = { id: string; name: string; slug: string };

type SchedulingRow = {
  card_id: string;
  due_at: string;
  mastery: number;
  mastery_7d_ago: number | null;
};

async function loadTopicScheduling(
  supabase: SupabaseClient,
  userId: string
): Promise<{ topicList: TopicRow[]; cards: { id: string; topic_id: string }[]; scheduling: SchedulingRow[] }> {
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, slug")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("name");

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
  let scheduling: SchedulingRow[] = [];

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

  return { topicList, cards, scheduling };
}

function buildDashboardTopics(
  topicList: TopicRow[],
  cards: { id: string; topic_id: string }[],
  scheduling: SchedulingRow[]
): DashboardTopic[] {
  const schedByCard = new Map(scheduling.map((s) => [s.card_id, s]));
  const now = new Date().toISOString();

  return topicList.map((topic) => {
    const topicCards = cards.filter((c) => c.topic_id === topic.id);
    const totalCards = topicCards.length;
    const topicSched = topicCards
      .map((c) => schedByCard.get(c.id))
      .filter(Boolean) as SchedulingRow[];

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
}

type ReviewEventRow = { reviewed_at: string; cards_reviewed: number };

async function loadAccountContext(
  supabase: SupabaseClient,
  userId: string
): Promise<{ accountStart: Date; accountCreatedAt: string }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", userId)
    .single();

  const accountCreatedAt = profile?.created_at ?? new Date().toISOString();
  const accountStart = new Date(accountCreatedAt);
  accountStart.setHours(0, 0, 0, 0);
  return { accountStart, accountCreatedAt };
}

async function loadRecentReviews(
  supabase: SupabaseClient,
  userId: string,
  accountCreatedAt: string,
  accountStart: Date,
  days = 90
): Promise<ReviewEventRow[]> {
  const activityStart = new Date();
  activityStart.setDate(activityStart.getDate() - (days - 1));
  activityStart.setHours(0, 0, 0, 0);

  const queryStart =
    activityStart.getTime() > accountStart.getTime() ? activityStart : accountStart;

  const { data: reviews } = await supabase
    .from("review_events")
    .select("reviewed_at, cards_reviewed")
    .eq("user_id", userId)
    .gte("reviewed_at", queryStart.toISOString())
    .order("reviewed_at");

  return (reviews ?? []).filter((r) => r.reviewed_at >= accountCreatedAt);
}

export async function getDashboardDisplayName(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();
  return profile?.display_name?.split(" ")[0] ?? "there";
}

function buildForecastFromScheduling(
  scheduling: SchedulingRow[]
): { day: string; count: number }[] {
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
    forecast.push({ day: `${WEEKDAYS[d.getDay()]} ${d.getDate()}`, count });
  }

  return forecast;
}

export async function getDashboardTopicsAndForecast(
  supabase: SupabaseClient,
  userId: string
): Promise<{ topics: DashboardTopic[]; forecast: { day: string; count: number }[] }> {
  const { topicList, cards, scheduling } = await loadTopicScheduling(supabase, userId);
  return {
    topics: buildDashboardTopics(topicList, cards, scheduling),
    forecast: buildForecastFromScheduling(scheduling),
  };
}

export async function getDashboardTopics(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardTopic[]> {
  const { topics } = await getDashboardTopicsAndForecast(supabase, userId);
  return topics;
}

export async function getDashboardForecast(
  supabase: SupabaseClient,
  userId: string
): Promise<{ day: string; count: number }[]> {
  const { forecast } = await getDashboardTopicsAndForecast(supabase, userId);
  return forecast;
}

export async function getDashboardActivity(supabase: SupabaseClient, userId: string): Promise<{
  activityGrid: ActivityLevel[];
  streakDays: number;
  totalReviewsInPeriod: number;
}> {
  await ensureDemoDataPurged(supabase, userId);

  const { accountStart, accountCreatedAt } = await loadAccountContext(supabase, userId);
  const reviews = await loadRecentReviews(
    supabase,
    userId,
    accountCreatedAt,
    accountStart
  );
  const { activityGrid } = buildActivityGrid(reviews, 90, accountStart);
  const reviewDateSet = reviewEventsToDateKeys(reviews);
  const streakDays = computeReviewStreak(reviewDateSet);
  const totalReviewsInPeriod = reviews.reduce((s, r) => s + r.cards_reviewed, 0);

  return { activityGrid, streakDays, totalReviewsInPeriod };
}

export async function getDashboardInsight(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const [{ data: insightRow }, topics] = await Promise.all([
    supabase.from("user_insights").select("body").eq("user_id", userId).single(),
    getDashboardTopics(supabase, userId),
  ]);

  if (insightRow?.body) return insightRow.body;

  const totalDue = topics.reduce((s, t) => s + t.due, 0);
  const weakest = [...topics].sort((a, b) => a.mastery - b.mastery)[0];

  return weakest
    ? `Your ${weakest.name} deck is at ${weakest.mastery}% mastery with ${weakest.due} cards due. You have ${totalDue} cards due today — start a focused review session.`
    : "Create your first topic to start building your retention streak.";
}

export async function getDashboardSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  displayName: string;
  totalDue: number;
  streakDays: number;
  activityGrid: ActivityLevel[];
  totalReviewsInPeriod: number;
  minutesPerCard: number;
}> {
  const [displayName, stats, activity] = await Promise.all([
    getDashboardDisplayName(supabase, userId),
    getReviewStats(supabase, userId),
    getDashboardActivity(supabase, userId),
  ]);

  return {
    displayName,
    totalDue: stats.totalDue,
    streakDays: activity.streakDays,
    activityGrid: activity.activityGrid,
    totalReviewsInPeriod: activity.totalReviewsInPeriod,
    minutesPerCard: MINUTES_PER_CARD,
  };
}

export async function getDashboard(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardPayload> {
  const [summary, topics, forecast, insight] = await Promise.all([
    getDashboardSummary(supabase, userId),
    getDashboardTopics(supabase, userId),
    getDashboardForecast(supabase, userId),
    getDashboardInsight(supabase, userId),
  ]);

  return {
    displayName: summary.displayName,
    topics,
    forecast,
    activityGrid: summary.activityGrid,
    streakDays: summary.streakDays,
    insight,
    minutesPerCard: summary.minutesPerCard,
  };
}
