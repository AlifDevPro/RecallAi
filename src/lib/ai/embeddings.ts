import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_CONFIG } from "./config";
import { logAiUsage } from "./usage-log";

function getClient() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  return new GoogleGenerativeAI(key);
}

async function embedWithModel(
  text: string,
  modelName: string
): Promise<number[]> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: modelName });
  const result = await model.embedContent(text);
  const values = result.embedding.values;
  if (values.length !== AI_CONFIG.embeddingDimensions) {
    return normalizeVector(values, AI_CONFIG.embeddingDimensions);
  }
  return values;
}

function normalizeVector(values: number[], targetDim: number): number[] {
  if (values.length === targetDim) return values;
  if (values.length > targetDim) return values.slice(0, targetDim);
  const out = [...values];
  while (out.length < targetDim) out.push(0);
  return out;
}

/** Deterministic fallback when all embedding APIs fail (degraded search). */
function hashEmbed(text: string): number[] {
  const dim = AI_CONFIG.embeddingDimensions;
  const vec = new Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    vec[i % dim] += (c * (i + 1)) / 1000;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embedText(
  text: string,
  options: { userId?: string | null; route?: string } = {}
): Promise<number[]> {
  const start = Date.now();
  const trimmed = text.trim().slice(0, 8000);
  if (!trimmed) return hashEmbed("empty");

  const models = [AI_CONFIG.embeddingModel, AI_CONFIG.embeddingFallbackModel];
  let lastError: unknown;

  for (const modelName of models) {
    try {
      const values = await embedWithModel(trimmed, modelName);
      await logAiUsage({
        userId: options.userId,
        provider: "google",
        model: modelName,
        route: options.route ?? "embed",
        tokensIn: Math.ceil(trimmed.length / 4),
        tokensOut: 0,
        latencyMs: Date.now() - start,
      });
      return values;
    } catch (err) {
      lastError = err;
    }
  }

  console.warn("Embedding API failed, using hash fallback:", lastError);
  return hashEmbed(trimmed);
}

export async function embedBatch(
  texts: string[],
  options: { userId?: string | null; route?: string } = {}
): Promise<number[][]> {
  const batchSize = 5;
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const slice = texts.slice(i, i + batchSize);
    const embedded = await Promise.all(
      slice.map((t) => embedText(t, { ...options, route: options.route ?? "embed-batch" }))
    );
    results.push(...embedded);
  }
  return results;
}
