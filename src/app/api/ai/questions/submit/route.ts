import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestDocument } from "@/lib/vectors/ingest";
import type { ExtractedQuestion } from "@/lib/ai/ocr";

type SubmitBody = {
  extracted: ExtractedQuestion[];
  metadata?: {
    institution?: string;
    course?: string;
    semester?: string;
    year?: number;
    term?: string;
    topic?: string;
  };
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.extracted?.length) {
    return NextResponse.json({ error: "No questions to submit" }, { status: 400 });
  }

  const meta = body.metadata ?? {};

  const { data: submission, error: subError } = await supabase
    .from("question_submissions")
    .insert({
      user_id: user?.id ?? null,
      status: "pending",
      institution: meta.institution ?? body.extracted[0]?.inst ?? "",
      course: meta.course ?? "",
      semester: meta.semester ?? "",
      year: meta.year ?? body.extracted[0]?.year,
      term: meta.term ?? body.extracted[0]?.term ?? "",
      topic: meta.topic ?? body.extracted[0]?.topic ?? "",
    })
    .select("id")
    .single();

  if (subError || !submission) {
    return NextResponse.json({ error: subError?.message ?? "Submit failed" }, { status: 500 });
  }

  for (const q of body.extracted) {
    const { data: row } = await supabase
      .from("submitted_questions")
      .insert({
        submission_id: submission.id,
        raw_text: q.raw,
        cleaned_text: q.cleaned,
        marks: q.marks,
        topic: q.topic,
        term: q.term,
        year: q.year,
        question_type: q.type,
        confidence: q.conf,
      })
      .select("id")
      .single();

    if (row) {
      const text = `${q.cleaned}\nTopic: ${q.topic}\nInstitution: ${q.inst}\nYear: ${q.year}\nTerm: ${q.term}\nMarks: ${q.marks}`;
      await ingestDocument({
        sourceType: "question",
        sourceId: row.id,
        userId: user?.id ?? null,
        title: `${q.topic} — ${q.term} ${q.year}`,
        text,
        metadata: {
          visibility: user ? "private" : "public",
          institution: q.inst,
          marks: q.marks,
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    submissionId: submission.id,
    points: body.extracted.length * 5,
  });
}
