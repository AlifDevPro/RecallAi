import { generateWithFailover } from "@/lib/ai/router";
import { TUTOR_SYSTEM } from "./prompts";
import {
  assessContextQuality,
  buildTutorUserPrompt,
  formatTutorContext,
} from "./context";
import { composeTutorReply } from "./compose";
import { retrieveTutorContext } from "./retrieve";
import { logTutorDebug, logTutorTurn } from "./logger";
import {
  fetchLearnerContext,
  formatLearnerContext,
  isMistakeFocusedQuestion,
  type RecentQuizSession,
} from "./learner-context";
import type { TutorComposedReply, TutorDebugMeta } from "./types";

export type TutorPipelineInput = {
  message: string;
  userId: string;
  supabase: import("@supabase/supabase-js").SupabaseClient;
  topicName?: string | null;
  topicSlug?: string | null;
  recentTurns?: { role: string; content: string }[];
  recentQuiz?: RecentQuizSession | null;
};

export type TutorPipelineResult = TutorComposedReply & {
  debug?: TutorDebugMeta;
};

export async function runTutorPipeline(
  input: TutorPipelineInput
): Promise<TutorPipelineResult> {
  const [chunks, learnerCtx] = await Promise.all([
    retrieveTutorContext(input.message, {
      userId: input.userId,
      topicName: input.topicName,
      topicSlug: input.topicSlug,
      matchCount: 10,
    }),
    fetchLearnerContext(input.supabase, input.userId, {
      topicSlug: input.topicSlug,
      recentQuiz: input.recentQuiz,
    }),
  ]);

  const contextQuality = assessContextQuality(chunks);
  const context = formatTutorContext(chunks);
  const learnerProfile = formatLearnerContext(learnerCtx, input.topicName);
  const mistakeFocused = isMistakeFocusedQuestion(input.message);

  const prompt = buildTutorUserPrompt({
    question: input.message,
    context,
    contextQuality,
    learnerProfile,
    mistakeFocused,
    topicName: input.topicName,
    recentTurns: input.recentTurns,
  });

  logTutorTurn("retrieve", {
    userId: input.userId,
    chunkCount: chunks.length,
    contextQuality,
    mistakeFocused,
    weakCards: learnerCtx.weakCards.length,
    mockMistakes: learnerCtx.mockMistakes.length,
    refs: chunks.map((c) => c.ref),
  });

  const { text: rawModelOutput } = await generateWithFailover(prompt, {
    system: TUTOR_SYSTEM,
    json: true,
    route: "tutor-chat",
    userId: input.userId,
    maxTokens: 4096,
  });

  const composed = composeTutorReply(rawModelOutput, chunks);

  const debug: TutorDebugMeta = {
    retrievalCount: chunks.length,
    contextQuality,
    rawModelOutput,
    refs: chunks.map((c) => `${c.ref}:${c.sourceType}:${c.sourceId}`),
  };

  logTutorDebug(debug);
  logTutorTurn("compose", {
    userId: input.userId,
    sourceCount: composed.sources.length,
    answerLength: composed.structured.answer.length,
  });

  return { ...composed, debug };
}

/** Split display text into chunks for simulated streaming UX. */
export function* streamDisplayChunks(text: string, wordsPerChunk = 3): Generator<string> {
  const words = text.split(/(\s+)/);
  let buffer = "";
  let count = 0;
  for (const w of words) {
    buffer += w;
    if (w.trim()) count++;
    if (count >= wordsPerChunk) {
      yield buffer;
      buffer = "";
      count = 0;
    }
  }
  if (buffer) yield buffer;
}
