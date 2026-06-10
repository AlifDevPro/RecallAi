const CARD_TOPIC_TAG = /\[(?:card|topic|paper|question|insight|chat_turn|review_note|schedule_block|mock_rubric):[^\]]+\]/gi;
const REF_TAG = /\[REF-\d+\]/gi;
const UUID =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const RETRIEVAL_PHRASES =
  /\b(?:based on (?:your )?study materials|according to (?:the )?context chunks?|from the (?:provided )?context chunks?)\b[:,]?\s*/gi;

/** Strip internal IDs, retrieval artifacts, and boilerplate from user-facing text. */
export function sanitizeTutorText(text: string): string {
  return text
    .replace(CARD_TOPIC_TAG, "")
    .replace(REF_TAG, "")
    .replace(UUID, "")
    .replace(RETRIEVAL_PHRASES, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function containsInternalArtifacts(text: string): boolean {
  return (
    /\[(?:card|topic|paper|question|insight|chat_turn|review_note|schedule_block|mock_rubric):[^\]]+\]/i.test(
      text
    ) ||
    /\[REF-\d+\]/i.test(text) ||
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(text)
  );
}
