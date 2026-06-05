export type ReviewRating = "again" | "hard" | "good" | "easy";

const DAY_MS = 86400_000;

export function nextScheduling(
  rating: ReviewRating,
  current: { mastery: number; due_at: string }
) {
  const mastery = Number(current.mastery);
  let nextMastery = mastery;
  let days = 1;

  switch (rating) {
    case "again":
      nextMastery = Math.max(0, mastery - 12);
      days = 1;
      break;
    case "hard":
      nextMastery = Math.max(0, mastery - 5);
      days = 2;
      break;
    case "good":
      nextMastery = Math.min(100, mastery + 6);
      days = 3;
      break;
    case "easy":
      nextMastery = Math.min(100, mastery + 10);
      days = 7;
      break;
  }

  const dueAt = new Date(Date.now() + days * DAY_MS).toISOString();
  return {
    mastery: nextMastery,
    mastery_7d_ago: mastery,
    due_at: dueAt,
    last_reviewed_at: new Date().toISOString(),
  };
}
