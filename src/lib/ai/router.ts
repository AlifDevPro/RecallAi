import { AI_CONFIG, isGroqConfigured } from "./config";
import * as groq from "./groq";
import { logAiUsage } from "./usage-log";

export type GenerateOptions = {
  system?: string;
  json?: boolean;
  route?: string;
  userId?: string | null;
  maxTokens?: number;
};

export async function generateWithFailover(
  prompt: string,
  options: GenerateOptions = {}
): Promise<{ text: string; provider: "groq" }> {
  if (!isGroqConfigured()) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const start = Date.now();
  const { text, tokensIn, tokensOut } = await groq.groqGenerateText(prompt, options);
  await logAiUsage({
    userId: options.userId,
    provider: "groq",
    model: AI_CONFIG.groqModel,
    route: options.route ?? "generate",
    tokensIn,
    tokensOut,
    latencyMs: Date.now() - start,
  });
  return { text, provider: "groq" };
}

export async function streamWithFailover(
  prompt: string,
  options: GenerateOptions = {}
): Promise<{
  stream: AsyncIterable<string>;
  provider: "groq";
  finalize: () => Promise<void>;
}> {
  if (!isGroqConfigured()) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const start = Date.now();
  const { stream, tokensIn, getTokensOut } = await groq.groqStreamText(prompt, options);
  return {
    stream,
    provider: "groq",
    finalize: async () => {
      await logAiUsage({
        userId: options.userId,
        provider: "groq",
        model: AI_CONFIG.groqModel,
        route: options.route ?? "stream",
        tokensIn,
        tokensOut: getTokensOut(),
        latencyMs: Date.now() - start,
      });
    },
  };
}
