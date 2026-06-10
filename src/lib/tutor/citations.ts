import type { TutorRetrievedChunk, TutorSourceDisplay } from "./types";

function sourceHref(sourceType: string, sourceId: string): string | undefined {
  switch (sourceType) {
    case "question":
    case "paper":
      return `/questions/${sourceId}`;
    case "topic":
      return `/topics/${sourceId}`;
    case "card":
      return "/review";
    default:
      return undefined;
  }
}

export function buildDisplayLabel(
  sourceType: string,
  title: string,
  topicName?: string | null
): string {
  const cleanTitle = title.trim() || "Study material";
  switch (sourceType) {
    case "card":
      return topicName ? `From: ${topicName} → ${cleanTitle}` : `From: ${cleanTitle} card`;
    case "topic":
      return `From: ${cleanTitle} deck`;
    case "paper":
    case "paper_page":
      return `From: ${cleanTitle}`;
    case "question":
      return `From: Question bank — ${cleanTitle}`;
    default:
      return `From: ${cleanTitle}`;
  }
}

export function chunkToSourceDisplay(chunk: TutorRetrievedChunk): TutorSourceDisplay {
  return {
    ref: chunk.ref,
    label: chunk.displayLabel,
    sourceType: chunk.sourceType,
    href: sourceHref(chunk.sourceType, chunk.sourceId),
  };
}

export function resolveSourceDisplays(
  chunks: TutorRetrievedChunk[],
  refs: string[] | undefined
): TutorSourceDisplay[] {
  const byRef = new Map(chunks.map((c) => [c.ref, c]));
  const selected =
    refs && refs.length > 0
      ? refs.map((r) => byRef.get(r)).filter((c): c is TutorRetrievedChunk => Boolean(c))
      : chunks.slice(0, 4);

  const seen = new Set<string>();
  const out: TutorSourceDisplay[] = [];
  for (const chunk of selected) {
    const key = `${chunk.sourceType}:${chunk.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(chunkToSourceDisplay(chunk));
  }
  return out;
}
