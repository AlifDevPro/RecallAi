import { embedText } from "@/lib/ai/embeddings";
import { AI_CONFIG } from "@/lib/ai/config";
import { createClient } from "@/lib/supabase/server";

export type ChunkMatch = {
  id: string;
  content: string;
  sourceType: string;
  sourceId: string;
  title: string;
  similarity: number;
};

export async function searchContent(
  query: string,
  options: {
    userId?: string | null;
    includePublic?: boolean;
    matchCount?: number;
  } = {}
): Promise<ChunkMatch[]> {
  const embedding = await embedText(query, { userId: options.userId, route: "search" });
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("match_content_chunks", {
    query_embedding: embedding,
    match_count: options.matchCount ?? AI_CONFIG.ragMatchCount,
    filter_user_id: options.userId ?? null,
    include_public: options.includePublic ?? true,
  });

  if (error) {
    console.error("searchContent error:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    content: row.content as string,
    sourceType: (row.source_type ?? row.sourceType) as string,
    sourceId: (row.source_id ?? row.sourceId) as string,
    title: row.title as string,
    similarity: row.similarity as number,
  }));
}

export function formatRagContext(matches: ChunkMatch[]): string {
  if (matches.length === 0) return "No relevant context found.";
  return matches
    .map(
      (m, i) =>
        `[${m.sourceType}:${m.sourceId}] (${m.title})\n${m.content}`
    )
    .join("\n\n---\n\n");
}

export function extractCitations(matches: ChunkMatch[]) {
  return matches.map((m) => ({
    sourceType: m.sourceType,
    sourceId: m.sourceId,
    title: m.title,
    similarity: m.similarity,
  }));
}
