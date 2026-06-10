import type { TutorRetrievedChunk } from "./types";

const THIN_SIMILARITY = 0.55;

export function assessContextQuality(
  chunks: TutorRetrievedChunk[]
): "rich" | "thin" | "empty" {
  if (chunks.length === 0) return "empty";
  const top = Math.max(...chunks.map((c) => c.similarity));
  if (top < THIN_SIMILARITY) return "thin";
  return "rich";
}

/** Format retrieval for the LLM using REF-N labels — never raw UUIDs or slugs. */
export function formatTutorContext(chunks: TutorRetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No matching study material was found for this question.";
  }
  return chunks
    .map(
      (c) =>
        `[${c.ref}] (${c.displayLabel})\n${c.content.trim()}`
    )
    .join("\n\n---\n\n");
}

export function buildTutorUserPrompt(input: {
  question: string;
  context: string;
  contextQuality: "rich" | "thin" | "empty";
  topicName?: string | null;
  recentTurns?: { role: string; content: string }[];
}): string {
  const history =
    input.recentTurns && input.recentTurns.length > 0
      ? `Recent conversation:\n${input.recentTurns
          .map((t) => `${t.role}: ${t.content}`)
          .join("\n")}\n\n`
      : "";

  const topicLine = input.topicName ? `Active topic: ${input.topicName}\n` : "";

  const qualityHint =
    input.contextQuality === "empty"
      ? "Retrieval is EMPTY — answer from general knowledge only if safe, otherwise be honest that you lack their materials and suggest what to study."
      : input.contextQuality === "thin"
        ? "Retrieval is THIN — use what's available cautiously, note gaps, and suggest a focused follow-up or subtopic."
        : "Retrieval is RICH — ground your teaching in the provided excerpts but paraphrase naturally.";

  return `${topicLine}${qualityHint}

Study excerpts (internal refs only — never echo REF labels or IDs in your JSON):
${input.context}

${history}Student question: ${input.question}

Respond with JSON only matching the required schema.`;
}
