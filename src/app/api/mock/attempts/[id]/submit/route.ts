import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { gradeMockAttempt } from "@/lib/mock/grade-attempt";
import { normalizeMockConfig } from "@/lib/mock/validate-config";

function isMissingAnswerMetadataColumn(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" &&
    ["answer_audio_url", "answer_image_url", "answer_modality"].some((column) =>
      error.message?.includes(column)
    )
  );
}

export async function POST(
  request: Request,
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
    .select("id, config, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (attempt.status === "graded") {
    return NextResponse.json({ error: "Already graded" }, { status: 400 });
  }

  if (attempt.status === "submitted") {
    await supabase.from("mock_attempts").update({ status: "in_progress" }).eq("id", id);
  }

  const body = await request.json().catch(() => ({}));
  const answers = (body.answers ?? []) as {
    questionId: string;
    answerText?: string;
    answerAudioUrl?: string;
    answerImageUrl?: string;
    answerModality?: string;
  }[];

  for (const a of answers) {
    const row = {
      question_id: a.questionId,
      attempt_id: id,
      answer_text: a.answerText ?? null,
      answer_audio_url: a.answerAudioUrl ?? null,
      answer_image_url: a.answerImageUrl ?? null,
      answer_modality: a.answerModality ?? null,
    };
    const { error: answerError } = await supabase
      .from("mock_answers")
      .upsert(row, { onConflict: "question_id" });

    if (!answerError) continue;
    if (!isMissingAnswerMetadataColumn(answerError)) {
      return NextResponse.json({ error: answerError.message }, { status: 500 });
    }

    const { error: retryError } = await supabase.from("mock_answers").upsert(
      {
        question_id: row.question_id,
        attempt_id: row.attempt_id,
        answer_text: row.answer_text,
        answer_image_path: row.answer_image_url,
      },
      { onConflict: "question_id" }
    );
    if (retryError) {
      return NextResponse.json({ error: retryError.message }, { status: 500 });
    }
  }

  const config = normalizeMockConfig(attempt.config);
  if (typeof body.tabSwitches === "number") {
    config.tab_switches = body.tabSwitches;
  }

  let totalScore = 0;
  let maxScore = 0;
  try {
    const result = await gradeMockAttempt(supabase, id, user.id, config);
    totalScore = result.totalScore;
    maxScore = result.maxScore;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Grading failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { error: gradeError } = await supabase
    .from("mock_attempts")
    .update({
      status: "graded",
      score: totalScore,
      max_score: maxScore,
      submitted_at: new Date().toISOString(),
      config,
    })
    .eq("id", id);
  if (gradeError) {
    return NextResponse.json({ error: gradeError.message }, { status: 500 });
  }

  await createNotification(supabase, {
    userId: user.id,
    type: "achievement",
    title: "Mock exam graded",
    body: `You scored ${totalScore}/${maxScore}. View your detailed results.`,
  });

  return NextResponse.json({ score: totalScore, maxScore });
}
