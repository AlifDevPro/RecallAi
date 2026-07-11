import type { ReviewRating } from "./types";

/** Classic SM-2 scheduling state per card. */
export type Sm2State = {
  easiness: number;
  interval_days: number;
  repetitions: number;
  lapse_count: number;
};

export const SM2_INITIAL: Sm2State = {
  easiness: 2.5,
  interval_days: 0,
  repetitions: 0,
  lapse_count: 0,
};

const MIN_EASINESS = 1.3;

/** Map 4-button UI to SM-2 quality (0–5). */
export function ratingToQuality(rating: ReviewRating): number {
  switch (rating) {
    case "again":
      return 1;
    case "hard":
      return 3;
    case "good":
      return 4;
    case "easy":
      return 5;
  }
}

function updateEasiness(easiness: number, quality: number): number {
  const next =
    easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(MIN_EASINESS, Math.round(next * 100) / 100);
}

export type Sm2Result = Sm2State & {
  interval_days: number;
};

/**
 * Compute next SM-2 state after a review.
 * @see https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */
export function sm2Next(state: Sm2State, rating: ReviewRating): Sm2Result {
  const q = ratingToQuality(rating);
  let { easiness, interval_days, repetitions, lapse_count } = state;

  if (q < 3) {
    repetitions = 0;
    interval_days = 1;
    lapse_count += 1;
  } else {
    if (repetitions === 0) {
      interval_days = 1;
    } else if (repetitions === 1) {
      interval_days = 6;
    } else {
      interval_days = Math.max(1, Math.round(interval_days * easiness));
    }
    repetitions += 1;
    easiness = updateEasiness(easiness, q);
  }

  return {
    easiness,
    interval_days,
    repetitions,
    lapse_count,
  };
}

/** Preview interval if user picks this rating (for UI labels). */
export function previewSm2Interval(state: Sm2State, rating: ReviewRating): number {
  return sm2Next(state, rating).interval_days;
}

/** Derive retention mastery score (0–100) from SM-2 state for dashboards. */
export function masteryFromSm2(state: Sm2State): number {
  if (state.repetitions === 0) {
    return Math.max(0, 30 - state.lapse_count * 8);
  }
  const intervalScore = Math.min(50, state.interval_days * 2);
  const repScore = Math.min(30, state.repetitions * 6);
  const efScore = Math.min(20, (state.easiness - MIN_EASINESS) * 15);
  return Math.min(100, Math.round(intervalScore + repScore + efScore));
}
