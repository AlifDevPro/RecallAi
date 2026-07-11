import { resolveSourceDisplays } from "./citations";
import { sanitizeTutorText } from "./sanitize";
import {
  TutorResponseSchema,
  type TutorComposedReply,
  type TutorResponse,
  type TutorRetrievedChunk,
} from "./types";

const FALLBACK_RESPONSE: TutorResponse = {
  answer:
    "I'm having trouble putting together a clear answer right now. Try asking about one specific concept, or rephrase your question.",
  next_step: "Pick a subtopic — like a definition, example, or practice question — and ask again.",
  source_refs: [],
};

function cleanField(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = sanitizeTutorText(value);
  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanStringArray(values: string[] | null | undefined): string[] | undefined {
  if (!values?.length) return undefined;
  const cleaned = values
    .map((v) => cleanField(v))
    .filter((v): v is string => Boolean(v));
  return cleaned.length ? cleaned : undefined;
}

function sanitizeResponse(raw: TutorResponse): TutorResponse {
  return {
    answer: cleanField(raw.answer) ?? FALLBACK_RESPONSE.answer,
    key_points: cleanStringArray(raw.key_points),
    explanation: cleanField(raw.explanation),
    step_by_step: cleanStringArray(raw.step_by_step),
    example: cleanField(raw.example),
    worked_example: cleanField(raw.worked_example),
    common_mistake: cleanField(raw.common_mistake),
    your_mistake: cleanField(raw.your_mistake),
    why_wrong: cleanField(raw.why_wrong),
    why_correct: cleanField(raw.why_correct),
    recap: cleanField(raw.recap),
    quiz_question: cleanField(raw.quiz_question),
    follow_up: cleanField(raw.follow_up),
    next_step: cleanField(raw.next_step),
    source_refs: raw.source_refs ?? [],
  };
}

export function parseTutorModelOutput(rawText: string): TutorResponse {
  const trimmed = rawText.trim();
  if (!trimmed) return FALLBACK_RESPONSE;

  try {
    const json = JSON.parse(trimmed) as unknown;
    const parsed = TutorResponseSchema.safeParse(json);
    if (parsed.success) {
      return sanitizeResponse(parsed.data);
    }
  } catch {
    /* fall through */
  }

  const sanitized = sanitizeTutorText(trimmed);
  if (sanitized.length > 20) {
    return sanitizeResponse({ answer: sanitized, source_refs: [] });
  }

  return FALLBACK_RESPONSE;
}

const SECTION_LABELS: Record<string, string> = {
  explanation: "Why it matters",
  example: "Example",
  worked_example: "Worked solution",
  common_mistake: "Common mistake",
  your_mistake: "Your mistake",
  why_wrong: "Why your answer missed",
  why_correct: "Why the correct approach works",
  recap: "Quick recap",
  quiz_question: "Try this",
  next_step: "Next step",
};

function appendList(parts: string[], label: string, items: string[]) {
  if (!items.length) return;
  parts.push(`**${label}:**\n${items.map((item, i) => `${i + 1}. ${item}`).join("\n")}`);
}

export function composeDisplayText(structured: TutorResponse): string {
  const parts: string[] = [structured.answer];

  if (structured.key_points?.length) {
    appendList(parts, "Key points", structured.key_points);
  }

  for (const key of [
    "explanation",
    "example",
    "worked_example",
    "common_mistake",
    "your_mistake",
    "why_wrong",
    "why_correct",
    "recap",
    "quiz_question",
  ] as const) {
    const value = structured[key];
    if (!value) continue;
    const label = SECTION_LABELS[key];
    parts.push(label ? `**${label}:** ${value}` : value);
  }

  if (structured.step_by_step?.length) {
    appendList(parts, "Step by step", structured.step_by_step);
  }

  if (structured.follow_up) {
    parts.push(structured.follow_up);
  }
  if (structured.next_step) {
    parts.push(`**${SECTION_LABELS.next_step}:** ${structured.next_step}`);
  }

  return sanitizeTutorText(parts.join("\n\n"));
}

export function composeTutorReply(
  rawModelOutput: string,
  chunks: TutorRetrievedChunk[]
): TutorComposedReply {
  const structured = parseTutorModelOutput(rawModelOutput);
  const sources = resolveSourceDisplays(chunks, structured.source_refs);
  const displayText = composeDisplayText(structured);
  return { structured, displayText, sources };
}
