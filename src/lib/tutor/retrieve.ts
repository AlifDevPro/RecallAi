import { searchContent, type ChunkMatch } from "@/lib/vectors/search";
import { buildDisplayLabel } from "./citations";
import type { TutorRetrievedChunk } from "./types";

function toTutorChunk(
  match: ChunkMatch,
  index: number,
  topicName?: string | null
): TutorRetrievedChunk {
  const ref = `REF-${index + 1}`;
  return {
    ref,
    sourceType: match.sourceType,
    sourceId: match.sourceId,
    title: match.title,
    content: match.content,
    similarity: match.similarity,
    displayLabel: buildDisplayLabel(match.sourceType, match.title, topicName),
  };
}

export async function retrieveTutorContext(
  query: string,
  options: {
    userId: string;
    topicName?: string | null;
    topicSlug?: string | null;
    matchCount?: number;
  }
): Promise<TutorRetrievedChunk[]> {
  const augmentedQuery = options.topicName
    ? `${options.topicName}: ${query}`
    : query;

  const matches = await searchContent(augmentedQuery, {
    userId: options.userId,
    includePublic: true,
    matchCount: options.matchCount,
  });

  return matches.map((m, i) => toTutorChunk(m, i, options.topicName));
}
