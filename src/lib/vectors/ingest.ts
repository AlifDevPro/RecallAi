import { embedBatch } from "@/lib/ai/embeddings";
import { getEmbeddingDimensions } from "@/lib/ai/config";
import { createServiceClient } from "@/lib/supabase/service";
import { chunkText } from "./chunk";

export type SourceType =
  | "question"
  | "paper"
  | "paper_page"
  | "card"
  | "topic"
  | "insight"
  | "review_note"
  | "chat_turn"
  | "schedule_block"
  | "mock_rubric";

export type IngestParams = {
  sourceType: SourceType;
  sourceId: string;
  userId?: string | null;
  title: string;
  text: string;
  metadata?: Record<string, unknown>;
};

export async function ingestDocument(params: IngestParams): Promise<string | null> {
  const text = params.text.trim();
  if (!text) return null;

  const supabase = createServiceClient();
  const visibility = (params.metadata?.visibility as string) ?? (params.userId ? "private" : "public");

  const { data: doc, error: docError } = await supabase
    .from("content_documents")
    .upsert(
      {
        source_type: params.sourceType,
        source_id: params.sourceId,
        user_id: params.userId ?? null,
        title: params.title,
        metadata: { ...params.metadata, visibility },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_type,source_id,user_id" }
    )
    .select("id")
    .single();

  if (docError || !doc) {
    console.error("ingestDocument doc error:", docError);
    return null;
  }

  await supabase.from("content_chunks").delete().eq("document_id", doc.id);

  const chunks = chunkText(text);
  if (chunks.length === 0) return doc.id;

  const embeddings = await embedBatch(chunks, {
    userId: params.userId,
    route: `ingest-${params.sourceType}`,
  });

  const targetDim = getEmbeddingDimensions();
  const rows = chunks.map((content, chunk_index) => ({
    document_id: doc.id,
    chunk_index,
    content,
    embedding: normalizeEmbedding(embeddings[chunk_index], targetDim),
    token_count: Math.ceil(content.length / 4),
  }));

  const { error: chunkError } = await supabase.from("content_chunks").insert(rows);
  if (chunkError) {
    console.error("ingestDocument chunks error:", chunkError);
  }

  return doc.id;
}

function normalizeEmbedding(values: number[], targetDim: number): number[] {
  if (values.length === targetDim) return values;
  if (values.length > targetDim) return values.slice(0, targetDim);
  const out = [...values];
  while (out.length < targetDim) out.push(0);
  return out;
}
