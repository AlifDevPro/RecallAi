import type { ReviewRating } from "./types";
import type { SchedulingState } from "./update-scheduling";
import { previewIntervalDays } from "./update-scheduling";

export function formatIntervalDays(days: number): string {
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const weeks = Math.round(days / 7);
  if (weeks < 8) return `${weeks}w`;
  const months = Math.round(days / 30);
  return `${months}mo`;
}

export function formatIntervalShort(days: number): string {
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 180) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
}

/** @deprecated Use previewIntervalDays with card state */
export const RATING_INTERVAL_DAYS: Record<ReviewRating, number> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 7,
};

export function intervalLabelForRating(
  rating: ReviewRating,
  state?: SchedulingState | null
): string {
  if (state) {
    return formatIntervalShort(previewIntervalDays(state, rating));
  }
  return formatIntervalShort(RATING_INTERVAL_DAYS[rating]);
}
