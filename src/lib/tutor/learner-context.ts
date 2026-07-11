import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateTopicStats } from "@/lib/topics/aggregate-topic-stats";
import { parseGradeFeedback } from "@/lib/mock/grade-attempt";

export type RecentQuizMistake = {
  question: string;
  options?: string[];
  selectedIndex: number | null;
  correctIndex: number;
  explanation?: string;
};

export type RecentQuizSession = {
  topicSlug: string;
  topicName: string;
  score: number;
  total: number;
  completedAt: string;
  mistakes: RecentQuizMistake[];
};

export type LearnerContext = {
  weakTopics: { name: string; slug: string; mastery: number; due: number }[];
  weakCards: { topic: string; front: string; back: string; mastery: number }[];
  mockMistakes: {
    attemptTitle: string;
    question: string;
    topic: string;
    studentAnswer: string;
    modelAnswer: string;
    feedback: string;
    score: number;
    maxScore: number;
  }[];
  recentQuiz: RecentQuizSession | null;
  reviewStreak: number;
  cardsReviewed7d: number;
};

export function isMistakeFocusedQuestion(message: string): boolean {
  return /\b(mistake|wrong|incorrect|got wrong|explain my|why was i wrong|why is my answer|last quiz|recent quiz|what did i miss)\b/i.test(
    message
  );
}

export async function fetchLearnerContext(
  supabase: SupabaseClient,
  userId: string,
  options: { topicSlug?: string | null; recentQuiz?: RecentQuizSession | null } = {}
): Promise<LearnerContext> {
  const topics = await aggregateTopicStats(supabase, userId);
  const filtered = options.topicSlug
    ? topics.filter((t) => t.slug === options.topicSlug)
    : topics;

  const weakTopics = [...filtered]
    .filter((t) => t.status === "active")
    .sort((a, b) => a.mastery - b.mastery || b.due - a.due)
    .slice(0, 5)
    .map((t) => ({ name: t.name, slug: t.slug, mastery: t.mastery, due: t.due }));

  const weakCards = await fetchWeakCards(supabase, userId, options.topicSlug);
  const mockMistakes = await fetchRecentMockMistakes(supabase, userId);

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data: recentReviews } = await supabase
    .from("review_events")
    .select("reviewed_at, cards_reviewed")
    .eq("user_id", userId)
    .gte("reviewed_at", since.toISOString());

  const cardsReviewed7d = (recentReviews ?? []).reduce((s, r) => s + r.cards_reviewed, 0);
  const reviewStreak = computeStreak(recentReviews ?? []);

  return {
    weakTopics,
    weakCards,
    mockMistakes,
    recentQuiz: options.recentQuiz ?? null,
    reviewStreak,
    cardsReviewed7d,
  };
}

function computeStreak(events: { reviewed_at: string }[]): number {
  const days = new Set(events.map((e) => e.reviewed_at.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 30; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

async function fetchWeakCards(
  supabase: SupabaseClient,
  userId: string,
  topicSlug?: string | null
) {
  let topicQuery = supabase
    .from("topics")
    .select("id, name, slug")
    .eq("user_id", userId)
    .eq("status", "active");

  if (topicSlug) topicQuery = topicQuery.eq("slug", topicSlug);

  const { data: topics } = await topicQuery;
  if (!topics?.length) return [];

  const topicMap = new Map(topics.map((t) => [t.id, t]));
  const { data: cards } = await supabase
    .from("cards")
    .select("id, front, back, topic_id")
    .eq("user_id", userId)
    .in("topic_id", topics.map((t) => t.id));

  const cardIds = (cards ?? []).map((c) => c.id);
  if (!cardIds.length) return [];

  const { data: sched } = await supabase
    .from("card_scheduling")
    .select("card_id, mastery")
    .eq("user_id", userId)
    .in("card_id", cardIds);

  const masteryMap = new Map((sched ?? []).map((s) => [s.card_id, Number(s.mastery)]));

  return (cards ?? [])
    .map((c) => {
      const topic = topicMap.get(c.topic_id);
      return {
        topic: topic?.name ?? "General",
        front: c.front,
        back: c.back,
        mastery: masteryMap.get(c.id) ?? 0,
      };
    })
    .filter((c) => c.mastery < 65)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 8);
}

async function fetchRecentMockMistakes(supabase: SupabaseClient, userId: string) {
  const { data: attempt } = await supabase
    .from("mock_attempts")
    .select("id, title, submitted_at")
    .eq("user_id", userId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!attempt) return [];

  const [{ data: questions }, { data: answers }] = await Promise.all([
    supabase
      .from("mock_questions")
      .select("id, body, marks, topic")
      .eq("attempt_id", attempt.id)
      .order("sort_order"),
    supabase.from("mock_answers").select("*").eq("attempt_id", attempt.id),
  ]);

  const answerMap = new Map((answers ?? []).map((a) => [a.question_id, a]));
  const mistakes: LearnerContext["mockMistakes"] = [];

  for (const q of questions ?? []) {
    const a = answerMap.get(q.id);
    const score = Number(a?.score ?? 0);
    const maxScore = Number(q.marks) || 1;
    if (score >= maxScore) continue;

    const parsed = parseGradeFeedback(a?.feedback ?? null);
    mistakes.push({
      attemptTitle: attempt.title ?? "Mock exam",
      question: q.body,
      topic: q.topic || "General",
      studentAnswer: a?.answer_text ?? "(no answer)",
      modelAnswer: parsed.modelAnswer || "—",
      feedback: parsed.feedback || "Needs improvement",
      score,
      maxScore,
    });
    if (mistakes.length >= 5) break;
  }

  return mistakes;
}

export function formatLearnerContext(ctx: LearnerContext, topicName?: string | null): string {
  const lines: string[] = ["## Student learning profile (use this to personalize — especially for mistake questions)"];

  if (topicName) lines.push(`Focused topic: ${topicName}`);

  lines.push(
    `Review activity: ${ctx.cardsReviewed7d} cards in last 7 days · ${ctx.reviewStreak}-day streak`
  );

  if (ctx.weakTopics.length) {
    lines.push(
      "",
      "### Weak topics",
      ...ctx.weakTopics.map(
        (t) => `- ${t.name}: ${t.mastery}% mastery, ${t.due} cards due`
      )
    );
  }

  if (ctx.weakCards.length) {
    lines.push(
      "",
      "### Struggling flashcards",
      ...ctx.weakCards.map(
        (c) =>
          `- [${c.topic}] Q: ${c.front.slice(0, 200)} | A: ${c.back.slice(0, 200)} (${c.mastery}% retention)`
      )
    );
  }

  if (ctx.recentQuiz) {
    const q = ctx.recentQuiz;
    lines.push(
      "",
      `### Most recent in-app quiz (${q.topicName})`,
      `Score: ${q.score}/${q.total} · completed ${q.completedAt}`
    );
    if (q.mistakes.length) {
      lines.push("", "Wrong answers:");
      for (const m of q.mistakes.slice(0, 6)) {
        const picked =
          m.selectedIndex != null && m.options?.[m.selectedIndex]
            ? m.options[m.selectedIndex]
            : "(skipped)";
        const correct = m.options?.[m.correctIndex] ?? `option ${m.correctIndex + 1}`;
        lines.push(
          `- Q: ${m.question}`,
          `  Student picked: ${picked}`,
          `  Correct: ${correct}`,
          m.explanation ? `  Explanation: ${m.explanation}` : ""
        );
      }
    }
  }

  if (ctx.mockMistakes.length) {
    lines.push("", "### Recent mock exam mistakes");
    for (const m of ctx.mockMistakes) {
      lines.push(
        `- [${m.attemptTitle} · ${m.topic}] ${m.question.slice(0, 300)}`,
        `  Student answer: ${m.studentAnswer.slice(0, 300)}`,
        `  Model answer: ${m.modelAnswer.slice(0, 300)}`,
        `  Feedback: ${m.feedback.slice(0, 300)} (${m.score}/${m.maxScore})`
      );
    }
  }

  if (
    !ctx.weakTopics.length &&
    !ctx.weakCards.length &&
    !ctx.recentQuiz?.mistakes.length &&
    !ctx.mockMistakes.length
  ) {
    lines.push("", "No recent mistakes on file — teach from fundamentals and ask what they found confusing.");
  }

  return lines.filter(Boolean).join("\n");
}
