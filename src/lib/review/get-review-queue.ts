import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_SESSION_LIMIT,
  MAX_SESSION_LIMIT,
  MINUTES_PER_CARD,
} from "./constants";

export type ReviewQueueCard = {
  id: string;
  topic: string;
  topicSlug: string;
  question: string;
  answer: string;
  mastery: number;
  dueAt: string;
};

export type ReviewQueueMeta = {
  totalDue: number;
  sessionSize: number;
  estimatedMinutes: number;
  mode: "due" | "preview";
};

export type ReviewQueueResult = {
  cards: ReviewQueueCard[];
  meta: ReviewQueueMeta;
};

export type ReviewQueueOptions = {
  limit?: number;
  mode?: "due" | "preview";
  topicSlug?: string;
};

export type ReviewStats = {
  totalDue: number;
};

async function getActiveTopics(
  supabase: SupabaseClient,
  userId: string,
  topicSlug?: string
) {
  let query = supabase
    .from("topics")
    .select("id, name, slug")
    .eq("user_id", userId)
    .eq("status", "active");

  if (topicSlug) query = query.eq("slug", topicSlug);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function countDueForCards(
  supabase: SupabaseClient,
  userId: string,
  cardIds: string[]
): Promise<number> {
  if (!cardIds.length) return 0;
  const now = new Date().toISOString();
  const { count, error } = await supabase
    .from("card_scheduling")
    .select("card_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("card_id", cardIds)
    .lte("due_at", now);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getReviewStats(
  supabase: SupabaseClient,
  userId: string,
  topicSlug?: string
): Promise<ReviewStats> {
  const topics = await getActiveTopics(supabase, userId, topicSlug);
  const topicIds = topics.map((t) => t.id);
  if (!topicIds.length) return { totalDue: 0 };

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id")
    .eq("user_id", userId)
    .in("topic_id", topicIds);

  if (cardsError) throw new Error(cardsError.message);
  const cardIds = (cards ?? []).map((c) => c.id);
  const totalDue = await countDueForCards(supabase, userId, cardIds);
  return { totalDue };
}

export async function getReviewQueue(
  supabase: SupabaseClient,
  userId: string,
  options: ReviewQueueOptions = {}
): Promise<ReviewQueueResult> {
  const limit = Math.min(
    MAX_SESSION_LIMIT,
    Math.max(1, options.limit ?? DEFAULT_SESSION_LIMIT)
  );
  const mode = options.mode ?? "due";
  const now = new Date().toISOString();

  const topics = await getActiveTopics(supabase, userId, options.topicSlug);
  const topicMap = new Map(topics.map((t) => [t.id, t]));
  const topicIds = topics.map((t) => t.id);

  if (!topicIds.length) {
    return {
      cards: [],
      meta: { totalDue: 0, sessionSize: 0, estimatedMinutes: 0, mode },
    };
  }

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id, front, back, topic_id")
    .eq("user_id", userId)
    .in("topic_id", topicIds);

  if (cardsError) throw new Error(cardsError.message);

  const cardIds = (cards ?? []).map((c) => c.id);
  const totalDue = await countDueForCards(supabase, userId, cardIds);

  if (!cardIds.length) {
    return {
      cards: [],
      meta: { totalDue, sessionSize: 0, estimatedMinutes: 0, mode },
    };
  }

  let schedQuery = supabase
    .from("card_scheduling")
    .select("card_id, due_at, mastery")
    .eq("user_id", userId)
    .in("card_id", cardIds)
    .order("due_at", { ascending: true })
    .limit(limit);

  schedQuery =
    mode === "due" ? schedQuery.lte("due_at", now) : schedQuery.gt("due_at", now);

  const { data: schedRows, error: schedError } = await schedQuery;
  if (schedError) throw new Error(schedError.message);

  const cardMap = new Map((cards ?? []).map((c) => [c.id, c]));
  const ordered: ReviewQueueCard[] = [];

  for (const row of schedRows ?? []) {
    const c = cardMap.get(row.card_id);
    if (!c) continue;
    const topic = topicMap.get(c.topic_id);
    ordered.push({
      id: c.id,
      topic: topic?.name ?? "General",
      topicSlug: topic?.slug ?? "",
      question: c.front,
      answer: c.back,
      mastery: Number(row.mastery),
      dueAt: row.due_at,
    });
  }

  const sessionSize = ordered.length;
  return {
    cards: ordered,
    meta: {
      totalDue,
      sessionSize,
      estimatedMinutes: Math.max(1, Math.ceil(sessionSize * MINUTES_PER_CARD)),
      mode,
    },
  };
}
