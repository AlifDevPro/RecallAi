import { AI_CONFIG } from "@/lib/ai/config";

export function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunkWords = AI_CONFIG.chunkSize;
  const overlapWords = AI_CONFIG.chunkOverlap;
  const chunks: string[] = [];

  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkWords, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start = end - overlapWords;
  }

  return chunks;
}
