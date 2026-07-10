import Groq from "groq-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateWithFailover } from "@/lib/ai/router";
import { MOCK_GRADE_SYSTEM } from "@/lib/ai/prompts";
import { groqGenerateVision } from "@/lib/ai/groq";
import type { MockConfig } from "./validate-config";

type QuestionRow = {
  id: string;
  body: string;
  marks: number;
  section: string;
  choices: unknown;
  correct_index?: number | null;
};

type AnswerRow = {
  question_id: string;
  answer_text: string | null;
  answer_audio_url?: string | null;
  answer_image_url?: string | null;
  answer_image_path?: string | null;
  answer_modality?: string | null;
};

export type GradeResult = {
  totalScore: number;
  maxScore: number;
};

function parseChoices(choices: unknown): string[] | null {
  if (!choices) return null;
  if (Array.isArray(choices)) {
    return choices.map(String);
  }
  if (typeof choices === "object" && choices !== null && "options" in choices) {
    const opts = (choices as { options?: unknown[] }).options;
    return Array.isArray(opts) ? opts.map(String) : null;
  }
  return null;
}

function parseCorrectIndex(choices: unknown): number | null {
  if (typeof choices !== "object" || choices === null || !("correctIndex" in choices)) {
    return null;
  }
  const value = (choices as { correctIndex?: unknown }).correctIndex;
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function isMissingCorrectIndexColumn(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" ||
    (error?.message?.includes("correct_index") && error.message.includes("schema cache"))
  );
}

function isMissingAnswerMetadataColumn(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" &&
    ["answer_audio_url", "answer_image_url", "answer_modality"].some((column) =>
      error.message?.includes(column)
    )
  );
}

async function upsertGradedAnswer(
  supabase: SupabaseClient,
  row: {
    question_id: string;
    attempt_id: string;
    answer_text: string | null;
    answer_modality: string;
    score: number;
    feedback: string;
    graded_at: string;
  }
) {
  const { error } = await supabase
    .from("mock_answers")
    .upsert(row, { onConflict: "question_id" });

  if (!error) return;
  if (!isMissingAnswerMetadataColumn(error)) {
    throw new Error(error.message);
  }

  const { error: retryError } = await supabase.from("mock_answers").upsert(
    {
      question_id: row.question_id,
      attempt_id: row.attempt_id,
      answer_text: row.answer_text,
      score: row.score,
      feedback: row.feedback,
      graded_at: row.graded_at,
    },
    { onConflict: "question_id" }
  );

  if (retryError) {
    throw new Error(retryError.message);
  }
}

async function transcribeAudio(url: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return "";
  const res = await fetch(url);
  if (!res.ok) return "";
  const buffer = Buffer.from(await res.arrayBuffer());
  const client = new Groq({ apiKey: key });
  const file = new File([buffer], "answer.webm", { type: "audio/webm" });
  try {
    const transcript = await client.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
    });
    return transcript.text?.trim() ?? "";
  } catch {
    return "";
  }
}

async function ocrImageUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) return "";
  const buffer = Buffer.from(await res.arrayBuffer());
  const base64 = buffer.toString("base64");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  try {
    const { text } = await groqGenerateVision(
      { text: "Transcribe the handwritten answer exactly.", imageBase64: base64, mimeType: contentType },
      { route: "mock-grade-ocr" }
    );
    return text.trim();
  } catch {
    return "";
  }
}

async function resolveAnswerText(answer: AnswerRow): Promise<{ text: string; modality: string }> {
  if (answer.answer_text?.trim()) {
    return {
      text: answer.answer_text.trim(),
      modality: answer.answer_modality ?? "text",
    };
  }
  if (answer.answer_audio_url) {
    const text = await transcribeAudio(answer.answer_audio_url);
    return { text, modality: "voice" };
  }
  const imageUrl = answer.answer_image_url ?? answer.answer_image_path;
  if (imageUrl) {
    const text = await ocrImageUrl(imageUrl);
    return { text, modality: "image" };
  }
  return { text: "", modality: answer.answer_modality ?? "text" };
}

function gradeMcq(
  answerText: string,
  choices: string[],
  correctIndex: number | null,
  marks: number,
  negativeMarking: boolean
): { score: number; feedback: string; modelAnswer: string } {
  const normalized = answerText.trim().toLowerCase();
  const idx = choices.findIndex((c) => c.trim().toLowerCase() === normalized);
  const correct =
    correctIndex != null && correctIndex >= 0 && correctIndex < choices.length
      ? choices[correctIndex]
      : null;

  if (idx >= 0 && correctIndex != null && idx === correctIndex) {
    return {
      score: marks,
      feedback: "Correct.",
      modelAnswer: correct ?? choices[correctIndex] ?? "",
    };
  }

  if (idx >= 0 && correctIndex != null) {
    const penalty = negativeMarking ? marks * 0.25 : 0;
    return {
      score: Math.max(0, -penalty),
      feedback: `Incorrect. The correct option was ${String.fromCharCode(65 + correctIndex)}.`,
      modelAnswer: correct ?? "",
    };
  }

  return {
    score: 0,
    feedback: "No valid MCQ selection.",
    modelAnswer: correct ?? "",
  };
}

async function gradeWithAi(
  questionBody: string,
  answerText: string,
  maxMarks: number,
  userId: string
): Promise<{ score: number; feedback: string; modelAnswer: string; deductions: string[] }> {
  const { text } = await generateWithFailover(
    `Question: ${questionBody}\nMax marks: ${maxMarks}\nStudent answer: ${answerText || "(no answer)"}\n\nGrade this answer.`,
    { system: MOCK_GRADE_SYSTEM, json: true, route: "mock-grade", userId }
  );

  try {
    const graded = JSON.parse(text) as {
      awarded?: number;
      score?: number;
      feedback?: string;
      modelAnswer?: string;
      deductions?: string[];
    };
    const score = Math.min(
      maxMarks,
      Math.max(0, Number(graded.awarded ?? graded.score) || 0)
    );
    return {
      score,
      feedback: graded.feedback ?? "",
      modelAnswer: graded.modelAnswer ?? "",
      deductions: Array.isArray(graded.deductions) ? graded.deductions.map(String) : [],
    };
  } catch {
    return { score: 0, feedback: text, modelAnswer: "", deductions: [] };
  }
}

export async function gradeMockAttempt(
  supabase: SupabaseClient,
  attemptId: string,
  userId: string,
  config: MockConfig
): Promise<GradeResult> {
  let { data: questions, error: questionsError } = await supabase
    .from("mock_questions")
    .select("id, body, marks, section, choices, correct_index")
    .eq("attempt_id", attemptId)
    .order("sort_order");

  if (isMissingCorrectIndexColumn(questionsError)) {
    const fallback = await supabase
      .from("mock_questions")
      .select("id, body, marks, section, choices")
      .eq("attempt_id", attemptId)
      .order("sort_order");
    questions = fallback.data;
    questionsError = fallback.error;
  }

  if (questionsError) {
    throw new Error(questionsError.message);
  }

  let { data: answers, error: answersError } = await supabase
    .from("mock_answers")
    .select("question_id, answer_text, answer_audio_url, answer_image_url, answer_modality")
    .eq("attempt_id", attemptId);

  if (isMissingAnswerMetadataColumn(answersError)) {
    const fallback = await supabase
      .from("mock_answers")
      .select("question_id, answer_text, answer_image_path")
      .eq("attempt_id", attemptId);
    answers = fallback.data;
    answersError = fallback.error;
  }

  if (answersError) {
    throw new Error(answersError.message);
  }

  const answerMap = new Map((answers ?? []).map((a) => [a.question_id, a as AnswerRow]));

  let totalScore = 0;
  let maxScore = 0;

  for (const q of (questions ?? []) as QuestionRow[]) {
    maxScore += q.marks;
    const answer = answerMap.get(q.id);
    const { text: answerText, modality } = answer
      ? await resolveAnswerText(answer)
      : { text: "", modality: "text" };

    const choices = parseChoices(q.choices);
    let score = 0;
    let feedback = "";
    let modelAnswer = "";
    let deductions: string[] = [];

    if (choices && choices.length > 0) {
      const correctIndex = q.correct_index ?? parseCorrectIndex(q.choices);
      const mcq = gradeMcq(answerText, choices, correctIndex, q.marks, config.rules.negative);
      score = mcq.score;
      feedback = mcq.feedback;
      modelAnswer = mcq.modelAnswer;
    } else {
      try {
        const graded = await gradeWithAi(q.body, answerText, q.marks, userId);
        score = graded.score;
        feedback = graded.feedback;
        modelAnswer = graded.modelAnswer;
        deductions = graded.deductions;
      } catch (e) {
        score = 0;
        feedback =
          e instanceof Error
            ? `AI grading unavailable: ${e.message}`
            : "AI grading unavailable.";
      }
    }

    totalScore += score;

    const feedbackPayload =
      deductions.length > 0
        ? JSON.stringify({ feedback, modelAnswer, deductions })
        : modelAnswer
          ? JSON.stringify({ feedback, modelAnswer })
          : feedback;

    await upsertGradedAnswer(supabase, {
      question_id: q.id,
      attempt_id: attemptId,
      answer_text: answerText || answer?.answer_text || null,
      answer_modality: modality,
      score,
      feedback: feedbackPayload,
      graded_at: new Date().toISOString(),
    });
  }

  return { totalScore, maxScore };
}

export function parseGradeFeedback(raw: string | null): {
  feedback: string;
  modelAnswer: string;
  deductions: string[];
} {
  if (!raw) return { feedback: "", modelAnswer: "", deductions: [] };
  try {
    const parsed = JSON.parse(raw) as {
      feedback?: string;
      modelAnswer?: string;
      deductions?: string[];
    };
    if (typeof parsed === "object" && parsed !== null) {
      return {
        feedback: parsed.feedback ?? raw,
        modelAnswer: parsed.modelAnswer ?? "",
        deductions: Array.isArray(parsed.deductions) ? parsed.deductions.map(String) : [],
      };
    }
  } catch {
    /* plain text */
  }
  return { feedback: raw, modelAnswer: "", deductions: [] };
}
