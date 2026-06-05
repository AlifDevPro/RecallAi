import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseGradeFeedback } from "@/lib/mock/grade-attempt";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: attempt } = await supabase
    .from("mock_attempts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: questions } = await supabase
    .from("mock_questions")
    .select("id, body, marks, topic, section")
    .eq("attempt_id", id)
    .order("sort_order");

  const { data: answers } = await supabase
    .from("mock_answers")
    .select("*")
    .eq("attempt_id", id);

  const answerMap = new Map((answers ?? []).map((a) => [a.question_id, a]));

  const breakdown = (questions ?? []).map((q) => {
    const a = answerMap.get(q.id);
    const parsed = parseGradeFeedback(a?.feedback ?? null);
    return {
      questionId: q.id,
      body: q.body,
      marks: q.marks,
      topic: q.topic,
      score: Number(a?.score ?? 0),
      feedback: parsed.feedback,
      modelAnswer: parsed.modelAnswer,
      deductions: parsed.deductions,
      answer: a?.answer_text ?? "",
      modality: a?.answer_modality ?? "text",
    };
  });

  const topicScores = new Map<string, { earned: number; max: number }>();
  for (const b of breakdown) {
    const tag = b.topic || "General";
    const cur = topicScores.get(tag) ?? { earned: 0, max: 0 };
    cur.earned += b.score;
    cur.max += b.marks;
    topicScores.set(tag, cur);
  }

  const weakness = Array.from(topicScores.entries())
    .map(([tag, s]) => ({
      tag,
      score: s.max > 0 ? Math.round((s.earned / s.max) * 100) : 0,
    }))
    .filter((w) => w.score < 70)
    .sort((a, b) => a.score - b.score);

  const strength = Array.from(topicScores.entries())
    .map(([tag, s]) => ({
      tag,
      score: s.max > 0 ? Math.round((s.earned / s.max) * 100) : 0,
    }))
    .filter((w) => w.score >= 80)
    .sort((a, b) => b.score - a.score);

  const score = Number(attempt.score ?? 0);
  const maxScore = Number(attempt.max_score ?? 0);
  const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const startedAt = attempt.started_at ? new Date(attempt.started_at).getTime() : 0;
  const submittedAt = attempt.submitted_at ? new Date(attempt.submitted_at).getTime() : 0;
  const usedMin =
    startedAt && submittedAt
      ? Math.max(1, Math.round((submittedAt - startedAt) / 60_000))
      : 0;
  const timeUsed =
    usedMin >= 60
      ? `${Math.floor(usedMin / 60)}h ${usedMin % 60}m`
      : usedMin > 0
        ? `${usedMin}m`
        : "—";

  const budgetMin = attempt.duration_min ?? 0;
  const timeBudget =
    budgetMin >= 60
      ? `${Math.floor(budgetMin / 60)}h ${budgetMin % 60}m`
      : `${budgetMin}m`;

  const modalityCounts = { text: 0, voice: 0, image: 0 };
  for (const b of breakdown) {
    const m = b.modality as keyof typeof modalityCounts;
    if (m in modalityCounts) modalityCounts[m]++;
  }
  const totalAnswers = breakdown.length || 1;
  const modalityMix = {
    text: Math.round((modalityCounts.text / totalAnswers) * 100),
    voice: Math.round((modalityCounts.voice / totalAnswers) * 100),
    image: Math.round((modalityCounts.image / totalAnswers) * 100),
  };

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      title: attempt.title,
      score,
      maxScore,
      status: attempt.status,
      submittedAt: attempt.submitted_at,
      scorePercent,
      timeUsed,
      timeBudget,
      config: attempt.config,
    },
    breakdown,
    weakness,
    strength,
    modalityMix,
  });
}
