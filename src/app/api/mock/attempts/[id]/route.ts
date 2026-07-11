import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeMockConfig } from "@/lib/mock/validate-config";

function isMissingAnswerMetadataColumn(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" &&
    ["answer_audio_url", "answer_image_url", "answer_modality"].some((column) =>
      error.message?.includes(column)
    )
  );
}

async function upsertAnswer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: {
    question_id: string;
    attempt_id: string;
    answer_text: string | null;
    answer_image_url: string | null;
    answer_audio_url: string | null;
    answer_modality: string | null;
  }
) {
  const { error } = await supabase.from("mock_answers").upsert(row, { onConflict: "question_id" });
  if (!error) return null;
  if (!isMissingAnswerMetadataColumn(error)) return error.message;

  const { error: retryError } = await supabase.from("mock_answers").upsert(
    {
      question_id: row.question_id,
      attempt_id: row.attempt_id,
      answer_text: row.answer_text,
      answer_image_path: row.answer_image_url,
    },
    { onConflict: "question_id" }
  );
  return retryError?.message ?? null;
}

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
    .select("*")
    .eq("attempt_id", id)
    .order("sort_order");

  const { data: answers } = await supabase
    .from("mock_answers")
    .select("*")
    .eq("attempt_id", id);

  const answerMap = new Map((answers ?? []).map((a) => [a.question_id, a]));

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      title: attempt.title,
      topics: attempt.topics,
      durationMin: attempt.duration_min,
      status: attempt.status,
      startedAt: attempt.started_at,
      config: attempt.config ?? {},
    },
    questions: (questions ?? []).map((q) => ({
      id: q.id,
      body: q.body,
      marks: q.marks,
      topic: q.topic,
      section: q.section,
      choices: q.choices,
      answer: answerMap.get(q.id),
    })),
  });
}

export async function PATCH(
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
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const answers = (body.answers ?? []) as {
    questionId: string;
    answerText?: string;
    answerImageUrl?: string;
    answerAudioUrl?: string;
    answerModality?: string;
  }[];

  for (const a of answers) {
    const err = await upsertAnswer(supabase, {
      question_id: a.questionId,
      attempt_id: id,
      answer_text: a.answerText ?? null,
      answer_image_url: a.answerImageUrl ?? null,
      answer_audio_url: a.answerAudioUrl ?? null,
      answer_modality: a.answerModality ?? null,
    });
    if (err) {
      return NextResponse.json({ error: err }, { status: 500 });
    }
  }

  if (Array.isArray(body.questionOrder) && body.questionOrder.length > 0) {
    const { data: attemptRow } = await supabase
      .from("mock_attempts")
      .select("config")
      .eq("id", id)
      .single();
    const config = normalizeMockConfig(attemptRow?.config ?? {});
    config.questionOrder = body.questionOrder.map(String).filter(Boolean);
    await supabase.from("mock_attempts").update({ config }).eq("id", id);
  }

  return NextResponse.json({ ok: true });
}
