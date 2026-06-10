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

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isPlaceholderText(value: string): boolean {
  const normalized = cleanText(value).toLowerCase();
  return /^.+\s+card\s+\d+$/.test(normalized) || /^answer\s+\d+$/.test(normalized);
}

function buildFallbackPrompt(topicName: string, position: number): string {
  const templates = [
    `What are the core ideas in ${topicName}?`,
    `How would you summarize the main concept in ${topicName}?`,
    `What detail about ${topicName} should you remember here?`,
    `What is the key takeaway from ${topicName}?`,
  ];

  return templates[position % templates.length];
}

function formatReviewQuestion(front: string, topicName: string, position: number): string {
  const cleaned = cleanText(front);
  if (!cleaned || isPlaceholderText(cleaned)) {
    return buildFallbackPrompt(topicName, position);
  }
  return cleaned;
}

function formatReviewAnswer(back: string, topicName: string): string {
  const cleaned = cleanText(back);
  if (!cleaned || isPlaceholderText(cleaned)) {
    return `Review the main notes for ${topicName}.`;
  }
  return cleaned;
}

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
  const now = new Date().toISOString();

  if (!topicSlug) {
    const { count, error } = await supabase
      .from("card_scheduling")
      .select("card_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("due_at", now);

    if (error) throw new Error(error.message);
    return { totalDue: count ?? 0 };
  }

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

  for (const [index, row] of (schedRows ?? []).entries()) {
    const c = cardMap.get(row.card_id);
    if (!c) continue;
    const topic = topicMap.get(c.topic_id);
    const topicName = topic?.name ?? "General";
    ordered.push({
      id: c.id,
      topic: topicName,
      topicSlug: topic?.slug ?? "",
      question: formatReviewQuestion(c.front, topicName, index),
      answer: formatReviewAnswer(c.back, topicName),
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
