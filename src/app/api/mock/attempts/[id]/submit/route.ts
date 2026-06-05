import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { gradeMockAttempt } from "@/lib/mock/grade-attempt";
import { normalizeMockConfig } from "@/lib/mock/validate-config";

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

  const body = await request.json().catch(() => ({}));
  const answers = (body.answers ?? []) as {
    questionId: string;
    answerText?: string;
    answerAudioUrl?: string;
    answerImageUrl?: string;
    answerModality?: string;
  }[];

  for (const a of answers) {
    await supabase.from("mock_answers").upsert(
      {
        question_id: a.questionId,
        attempt_id: id,
        answer_text: a.answerText ?? null,
        answer_audio_url: a.answerAudioUrl ?? null,
        answer_image_url: a.answerImageUrl ?? null,
        answer_modality: a.answerModality ?? null,
      },
      { onConflict: "question_id" }
    );
  }

  const config = normalizeMockConfig(attempt.config);
  if (typeof body.tabSwitches === "number") {
    config.tab_switches = body.tabSwitches;
  }

  await supabase
    .from("mock_attempts")
    .update({ status: "submitted", config, submitted_at: new Date().toISOString() })
    .eq("id", id);

  const { totalScore, maxScore } = await gradeMockAttempt(supabase, id, user.id, config);

  await supabase
    .from("mock_attempts")
    .update({
      status: "graded",
      score: totalScore,
      max_score: maxScore,
    })
    .eq("id", id);

  await createNotification(supabase, {
    userId: user.id,
    type: "achievement",
    title: "Mock exam graded",
    body: `You scored ${totalScore}/${maxScore}. View your detailed results.`,
  });

  return NextResponse.json({ score: totalScore, maxScore });
}
