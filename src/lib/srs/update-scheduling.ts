import type { ReviewRating } from "./types";
import {
  masteryFromSm2,
  previewSm2Interval,
  sm2Next,
  SM2_INITIAL,
  type Sm2State,
} from "./sm2";

export type { ReviewRating } from "./types";

export type SchedulingState = Sm2State & {
  mastery: number;
  due_at: string;
  last_reviewed_at?: string | null;
};

const DAY_MS = 86400_000;

export function defaultSchedulingState(dueAt?: string): SchedulingState {
  return {
    ...SM2_INITIAL,
    mastery: 0,
    due_at: dueAt ?? new Date().toISOString(),
    last_reviewed_at: null,
  };
}

export function parseSchedulingRow(row: Record<string, unknown>): SchedulingState {
  return {
    easiness: Number(row.easiness) || SM2_INITIAL.easiness,
    interval_days: Number(row.interval_days) || 0,
    repetitions: Number(row.repetitions) || 0,
    lapse_count: Number(row.lapse_count) || 0,
    mastery: Number(row.mastery) || 0,
    due_at: String(row.due_at ?? new Date().toISOString()),
    last_reviewed_at: row.last_reviewed_at ? String(row.last_reviewed_at) : null,
  };
}

export function nextScheduling(rating: ReviewRating, current: SchedulingState) {
  const prevMastery = Number(current.mastery);
  const sm2 = sm2Next(
    {
      easiness: current.easiness,
      interval_days: current.interval_days,
      repetitions: current.repetitions,
      lapse_count: current.lapse_count,
    },
    rating
  );

  const dueAt = new Date(Date.now() + sm2.interval_days * DAY_MS).toISOString();
  const mastery = masteryFromSm2(sm2);

  return {
    easiness: sm2.easiness,
    interval_days: sm2.interval_days,
    repetitions: sm2.repetitions,
    lapse_count: sm2.lapse_count,
    mastery,
    mastery_7d_ago: prevMastery,
    due_at: dueAt,
    last_reviewed_at: new Date().toISOString(),
  };
}

export function previewIntervalDays(state: SchedulingState, rating: ReviewRating): number {
  return previewSm2Interval(
    {
      easiness: state.easiness,
      interval_days: state.interval_days,
      repetitions: state.repetitions,
      lapse_count: state.lapse_count,
    },
    rating
  );
}
