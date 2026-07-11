import type { SupabaseClient } from "@supabase/supabase-js";
import { MINUTES_PER_CARD } from "@/lib/review/constants";

export type TopicDayLoad = {
  slug: string;
  name: string;
  mastery: number;
  reviewDue: number;
  newDue: number;
};

export type SrsDayForecast = {
  date: string;
  weekday: number;
  reviewDue: number;
  newDue: number;
  totalDue: number;
  estimatedMinutes: number;
  byTopic: TopicDayLoad[];
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function emptyDay(d: Date): SrsDayForecast {
  return {
    date: dateKey(d),
    weekday: d.getDay(),
    reviewDue: 0,
    newDue: 0,
    totalDue: 0,
    estimatedMinutes: 0,
    byTopic: [],
  };
}

function buildForecast(
  rows: { card_id: string; due_at: string; mastery: number; repetitions?: number }[],
  cardTopic: Map<string, string>,
  topicById: Map<string, { id: string; name: string; slug: string }>,
  rangeStart: Date,
  days: number
): SrsDayForecast[] {
  const dayBuckets = new Map<string, Map<string, { reviewDue: number; newDue: number; mastery: number }>>();

  for (const row of rows) {
    const day = dateKey(new Date(row.due_at));
    const topicId = cardTopic.get(row.card_id);
    if (!topicId) continue;
    const topic = topicById.get(topicId);
    if (!topic) continue;

    if (!dayBuckets.has(day)) dayBuckets.set(day, new Map());
    const topicMap = dayBuckets.get(day)!;
    if (!topicMap.has(topic.slug)) {
      topicMap.set(topic.slug, { reviewDue: 0, newDue: 0, mastery: Number(row.mastery) || 0 });
    }
    const bucket = topicMap.get(topic.slug)!;
    const reps = row.repetitions ?? (Number(row.mastery) > 0 ? 1 : 0);
    if (reps === 0) bucket.newDue += 1;
    else bucket.reviewDue += 1;
    bucket.mastery = Math.min(bucket.mastery, Number(row.mastery) || 0);
  }

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const topicMap = dayBuckets.get(key) ?? new Map();

    const byTopic: TopicDayLoad[] = Array.from(topicMap.entries()).map(([slug, v]) => {
      const topic = [...topicById.values()].find((t) => t.slug === slug);
      return {
        slug,
        name: topic?.name ?? slug,
        mastery: v.mastery,
        reviewDue: v.reviewDue,
        newDue: v.newDue,
      };
    });

    byTopic.sort((a, b) => a.mastery - b.mastery || b.reviewDue + b.newDue - (a.reviewDue + a.newDue));

    const reviewDue = byTopic.reduce((s, t) => s + t.reviewDue, 0);
    const newDue = byTopic.reduce((s, t) => s + t.newDue, 0);
    const totalDue = reviewDue + newDue;

    return {
      date: key,
      weekday: d.getDay(),
      reviewDue,
      newDue,
      totalDue,
      estimatedMinutes: Math.max(1, Math.ceil(totalDue * MINUTES_PER_CARD)),
      byTopic,
    };
  });
}

export async function getSrsForecast(
  supabase: SupabaseClient,
  userId: string,
  days = 7,
  fromDate = new Date()
): Promise<SrsDayForecast[]> {
  const rangeStart = startOfDay(fromDate);
  const rangeEnd = endOfDay(new Date(rangeStart));
  rangeEnd.setDate(rangeEnd.getDate() + days);

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, slug")
    .eq("user_id", userId)
    .eq("status", "active");

  if (!topics?.length) {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      return emptyDay(d);
    });
  }

  const topicById = new Map(topics.map((t) => [t.id, t]));

  const { data: cards } = await supabase
    .from("cards")
    .select("id, topic_id")
    .eq("user_id", userId)
    .in(
      "topic_id",
      topics.map((t) => t.id)
    );

  const cardIds = (cards ?? []).map((c) => c.id);
  if (!cardIds.length) {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      return emptyDay(d);
    });
  }

  const cardTopic = new Map((cards ?? []).map((c) => [c.id, c.topic_id]));

  const { data: schedRows, error } = await supabase
    .from("card_scheduling")
    .select("card_id, due_at, mastery, repetitions")
    .eq("user_id", userId)
    .in("card_id", cardIds)
    .gte("due_at", rangeStart.toISOString())
    .lt("due_at", rangeEnd.toISOString());

  if (error?.message?.includes("repetitions")) {
    const fallback = await supabase
      .from("card_scheduling")
      .select("card_id, due_at, mastery")
      .eq("user_id", userId)
      .in("card_id", cardIds)
      .gte("due_at", rangeStart.toISOString())
      .lt("due_at", rangeEnd.toISOString());
    const rows = (fallback.data ?? []).map((r) => ({
      ...r,
      repetitions: Number(r.mastery) > 0 ? 1 : 0,
    }));
    return buildForecast(rows, cardTopic, topicById, rangeStart, days);
  }

  return buildForecast(schedRows ?? [], cardTopic, topicById, rangeStart, days);
}

export async function getDueNowCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<{ reviewDue: number; newDue: number; totalDue: number }> {
  const now = new Date().toISOString();

  const { data: topics } = await supabase
    .from("topics")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active");

  const topicIds = (topics ?? []).map((t) => t.id);
  if (!topicIds.length) return { reviewDue: 0, newDue: 0, totalDue: 0 };

  const { data: cards } = await supabase
    .from("cards")
    .select("id")
    .eq("user_id", userId)
    .in("topic_id", topicIds);

  const cardIds = (cards ?? []).map((c) => c.id);
  if (!cardIds.length) return { reviewDue: 0, newDue: 0, totalDue: 0 };

  const { data: rows, error } = await supabase
    .from("card_scheduling")
    .select("card_id, repetitions")
    .eq("user_id", userId)
    .in("card_id", cardIds)
    .lte("due_at", now);

  if (error?.message?.includes("repetitions")) {
    const fallback = await supabase
      .from("card_scheduling")
      .select("card_id, mastery")
      .eq("user_id", userId)
      .in("card_id", cardIds)
      .lte("due_at", now);
    let reviewDue = 0;
    let newDue = 0;
    for (const row of fallback.data ?? []) {
      if (Number(row.mastery) > 0) reviewDue += 1;
      else newDue += 1;
    }
    return { reviewDue, newDue, totalDue: reviewDue + newDue };
  }

  let reviewDue = 0;
  let newDue = 0;
  for (const row of rows ?? []) {
    if ((row.repetitions ?? 0) === 0) newDue += 1;
    else reviewDue += 1;
  }

  return { reviewDue, newDue, totalDue: reviewDue + newDue };
}
