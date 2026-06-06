import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExamType } from "@/lib/data/question-papers";
import { ingestDocument } from "@/lib/vectors/ingest";

type SubmissionRow = {
  id: string;
  user_id: string | null;
  institution: string;
  course: string;
  semester: string;
  year: number | null;
  term: string;
  topic: string;
  file_paths: string[] | null;
};

type QuestionRow = {
  cleaned_text: string;
  marks: number;
  topic: string;
  term: string;
  year: number | null;
  question_type: string;
  confidence: Record<string, number>;
};

function parseCourse(raw: string): { code: string; title: string } {
  const dash = raw.split(/\s*[—–-]\s*/);
  if (dash.length >= 2) {
    return { code: dash[0].trim(), title: dash.slice(1).join(" - ").trim() };
  }
  const parts = raw.trim().split(/\s+/);
  if (parts.length >= 2 && /^[A-Za-z]{2,4}$/.test(parts[0])) {
    return { code: `${parts[0]} ${parts[1]}`, title: parts.slice(2).join(" ") || parts[1] };
  }
  return { code: raw.trim() || "General", title: raw.trim() || "General" };
}

function mapExamType(term: string): ExamType {
  const t = term.toLowerCase();
  if (t.includes("mid")) return "Mid";
  if (t.includes("quiz")) return "Quiz";
  if (t.includes("class")) return "Class Test";
  if (t.includes("improve")) return "Improvement";
  return "Final";
}

function avgConfidence(questions: QuestionRow[]): number {
  if (!questions.length) return 0.85;
  let sum = 0;
  let n = 0;
  for (const q of questions) {
    const vals = Object.values(q.confidence ?? {});
    for (const v of vals) {
      if (typeof v === "number") {
        sum += v;
        n++;
      }
    }
  }
  return n ? sum / n : 0.85;
}

export async function promoteSubmission(
  service: SupabaseClient,
  submissionId: string
): Promise<{ paperId: string }> {
  const { data: submission, error: subErr } = await service
    .from("question_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (subErr || !submission) {
    throw new Error(subErr?.message ?? "Submission not found");
  }

  const sub = submission as SubmissionRow;

  const { data: questions, error: qErr } = await service
    .from("submitted_questions")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });

  if (qErr) {
    throw new Error(qErr.message);
  }

  const rows = (questions ?? []) as QuestionRow[];
  const { code, title } = parseCourse(sub.course);
  const examType = mapExamType(sub.term);
  const totalMarks = rows.reduce((s, q) => s + (q.marks || 0), 0);
  const ocrAvg = avgConfidence(rows);
  const filePaths = Array.isArray(sub.file_paths) ? sub.file_paths : [];
  const paperId = `paper_${submissionId.replace(/-/g, "").slice(0, 12)}`;

  const sectionsMap = new Map<string, { title: string; questions: { q: string; marks: number }[] }>();
  for (const q of rows) {
    const sectionTitle = q.question_type || "Section A";
    if (!sectionsMap.has(sectionTitle)) {
      sectionsMap.set(sectionTitle, { title: sectionTitle, questions: [] });
    }
    sectionsMap.get(sectionTitle)!.questions.push({ q: q.cleaned_text, marks: q.marks });
  }

  const digital = {
    sections: Array.from(sectionsMap.values()).map((s) => ({
      title: s.title,
      questions: s.questions,
    })),
  };

  const scans = filePaths.map((path) => ({
    pageUrl: path,
    ocrConfidence: ocrAvg,
  }));

  let uploaderName = "Guest contributor";
  if (sub.user_id) {
    const { data: profile } = await service
      .from("profiles")
      .select("display_name")
      .eq("id", sub.user_id)
      .single();
    uploaderName = (profile as { display_name?: string } | null)?.display_name || "Contributor";
  }

  const { error: paperErr } = await service.from("papers").upsert({
    id: paperId,
    submission_id: submissionId,
    uploader_id: sub.user_id,
    course: code,
    course_title: title,
    university: sub.institution,
    department: sub.topic || "General",
    semester: sub.semester || "1",
    year: sub.year ?? new Date().getFullYear(),
    exam_type: examType,
    duration: examType === "Final" ? "3 hours" : examType === "Mid" ? "90 min" : "45 min",
    total_marks: totalMarks || rows.length * 5,
    uploader: uploaderName,
    verified: true,
    views: 0,
    has_digital: digital.sections.length > 0,
    has_photo: scans.length > 0,
    digital,
    scans,
    visibility: "public",
    updated_at: new Date().toISOString(),
  });

  if (paperErr) {
    throw new Error(paperErr.message);
  }

  const { error: statusErr } = await service
    .from("question_submissions")
    .update({ status: "approved" })
    .eq("id", submissionId);

  if (statusErr) {
    throw new Error(statusErr.message);
  }

  const paperText = digital.sections.flatMap((s) => s.questions.map((q) => q.q)).join("\n");

  try {
    await ingestDocument({
      sourceType: "paper",
      sourceId: paperId,
      userId: sub.user_id,
      title: `${title} — ${sub.year ?? ""}`,
      text: `${code} ${title} ${sub.institution}\n${paperText}`,
      metadata: {
        visibility: "public",
        university: sub.institution,
        examType,
        submissionId,
      },
    });
  } catch {
    /* vector ingest is optional for bank listing */
  }

  if (sub.user_id) {
    try {
      const { data: existingContrib } = await service
        .from("contributors")
        .select("contributions")
        .eq("id", sub.user_id)
        .maybeSingle();

      await service.from("contributors").upsert({
        id: sub.user_id,
        institution: sub.institution,
        contributions: (existingContrib?.contributions ?? 0) + rows.length,
      });

      await service.from("contributions").insert({
        contributor_id: sub.user_id,
        submission_id: submissionId,
        title: `${code} — ${sub.term} ${sub.year ?? ""}`,
      });
    } catch {
      /* contributor stats are optional */
    }
  }

  return { paperId };
}
