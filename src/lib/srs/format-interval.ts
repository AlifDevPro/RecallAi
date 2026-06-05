import type { ReviewRating } from "./update-scheduling";

export const RATING_INTERVAL_DAYS: Record<ReviewRating, number> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 7,
};

export function formatIntervalDays(days: number): string {
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function formatIntervalShort(days: number): string {
  return `${days}d`;
}

export function intervalLabelForRating(rating: ReviewRating): string {
  return formatIntervalShort(RATING_INTERVAL_DAYS[rating]);
}
