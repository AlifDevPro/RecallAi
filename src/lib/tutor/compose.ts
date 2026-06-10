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

function sanitizeResponse(raw: TutorResponse): TutorResponse {
  return {
    answer: cleanField(raw.answer) ?? FALLBACK_RESPONSE.answer,
    explanation: cleanField(raw.explanation),
    example: cleanField(raw.example),
    common_mistake: cleanField(raw.common_mistake),
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

const SECTION_LABELS: Record<keyof Omit<TutorResponse, "source_refs">, string> = {
  answer: "",
  explanation: "Why it matters",
  example: "Example",
  common_mistake: "Common mistake",
  recap: "Quick recap",
  quiz_question: "Try this",
  follow_up: "",
  next_step: "Next step",
};

export function composeDisplayText(structured: TutorResponse): string {
  const parts: string[] = [structured.answer];

  for (const key of [
    "explanation",
    "example",
    "common_mistake",
    "recap",
    "quiz_question",
  ] as const) {
    const value = structured[key];
    if (!value) continue;
    const label = SECTION_LABELS[key];
    parts.push(label ? `**${label}:** ${value}` : value);
  }

  if (structured.follow_up) {
    parts.push(structured.follow_up);
  }
  if (structured.next_step) {
    parts.push(`**Next step:** ${structured.next_step}`);
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
