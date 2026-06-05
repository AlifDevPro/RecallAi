import type { QuizQuestionDto } from "./types";

const MIN_OPTIONS = 4;

export function validateQuizQuestions(
  parsed: unknown,
  requestedCount: number
): QuizQuestionDto[] {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid quiz format");
  }

  const raw = (parsed as { questions?: unknown[] }).questions;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("No questions in response");
  }

  const minAccept = Math.min(requestedCount, Math.max(3, raw.length));
  const validated: QuizQuestionDto[] = [];

  for (let i = 0; i < raw.length && validated.length < requestedCount; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;

    const q = item as Record<string, unknown>;
    const prompt = typeof q.prompt === "string" ? q.prompt.trim() : "";
    const options = Array.isArray(q.options)
      ? q.options.map((o) => String(o).trim()).filter(Boolean)
      : [];
    const correct = Number(q.correct);
    const explanation = typeof q.explanation === "string" ? q.explanation.trim() : "";

    if (!prompt || options.length < MIN_OPTIONS) continue;
    if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) continue;
    if (!explanation) continue;

    validated.push({
      id: typeof q.id === "string" ? q.id : `q-${i + 1}`,
      prompt,
      options: options.slice(0, 4),
      correct,
      explanation,
    });
  }

  if (validated.length < minAccept) {
    throw new Error(`Expected at least ${minAccept} valid questions`);
  }

  return validated.slice(0, requestedCount);
}
