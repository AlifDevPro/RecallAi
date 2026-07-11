import { z } from "zod";

/** Internal retrieval chunk with a stable ref label for the LLM (never shown to users). */
export type TutorRetrievedChunk = {
  ref: string;
  sourceType: string;
  sourceId: string;
  title: string;
  content: string;
  similarity: number;
  displayLabel: string;
};

export type TutorSourceDisplay = {
  ref: string;
  label: string;
  sourceType: string;
  href?: string;
};

export const TutorResponseSchema = z.object({
  answer: z.string(),
  key_points: z.array(z.string()).optional().nullable(),
  explanation: z.string().optional().nullable(),
  step_by_step: z.array(z.string()).optional().nullable(),
  example: z.string().optional().nullable(),
  worked_example: z.string().optional().nullable(),
  common_mistake: z.string().optional().nullable(),
  your_mistake: z.string().optional().nullable(),
  why_wrong: z.string().optional().nullable(),
  why_correct: z.string().optional().nullable(),
  recap: z.string().optional().nullable(),
  quiz_question: z.string().optional().nullable(),
  follow_up: z.string().optional().nullable(),
  next_step: z.string().optional().nullable(),
  source_refs: z.array(z.string()).optional().default([]),
});

export type TutorResponse = z.infer<typeof TutorResponseSchema>;

export type TutorComposedReply = {
  structured: TutorResponse;
  displayText: string;
  sources: TutorSourceDisplay[];
};

export type TutorDebugMeta = {
  retrievalCount: number;
  contextQuality: "rich" | "thin" | "empty";
  rawModelOutput?: string;
  refs?: string[];
};
