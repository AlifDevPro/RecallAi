function parseEmbeddingDimensions(): number {
  const raw = process.env.EMBEDDING_DIMENSIONS;
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0 && n <= 4096) return n;
  }
  // Match migration 012_embedding_1024.sql (pgvector column is vector(1024)).
  return 1024;
}

export const AI_CONFIG = {
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  groqVisionModel:
    process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? "text-embedding-004",
  embeddingFallbackModel: "gemini-embedding-001",
  get embeddingDimensions() {
    return parseEmbeddingDimensions();
  },
  timeoutMs: 60_000,
  maxOutputTokens: 8192,
  chunkSize: 600,
  chunkOverlap: 80,
  ragMatchCount: 8,
} as const;

export function getEmbeddingDimensions(): number {
  return parseEmbeddingDimensions();
}

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

export function isLlmConfigured() {
  return isGroqConfigured();
}

export function isEmbeddingConfigured() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

/** @deprecated Use isLlmConfigured or isEmbeddingConfigured */
export function isAiConfigured() {
  return isLlmConfigured();
}
