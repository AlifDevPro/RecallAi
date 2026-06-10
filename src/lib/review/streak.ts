import type { ActivityLevel } from "@/lib/data/dashboard";

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function countToLevel(count: number): ActivityLevel {
  if (count === 0) return "empty";
  if (count >= 12) return "high";
  if (count >= 5) return "medium";
  return "low";
}

/** Streak with grace: if today has no review yet, yesterday still counts. */
export function computeReviewStreak(reviewDateKeys: Set<string>): number {
  if (reviewDateKeys.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (;;) {
    const key = localDateKey(cursor);
    if (reviewDateKeys.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1);
      const yesterday = localDateKey(cursor);
      if (reviewDateKeys.has(yesterday)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return streak;
}

export function reviewEventsToDateKeys(
  reviews: { reviewed_at: string }[]
): Set<string> {
  const keys = new Set<string>();
  for (const r of reviews) {
    const d = new Date(r.reviewed_at);
    if (!Number.isNaN(d.getTime())) {
      keys.add(localDateKey(d));
    }
  }
  return keys;
}

export function buildActivityGrid(
  reviews: { reviewed_at: string; cards_reviewed: number }[],
  days = 90,
  accountStart?: Date
): { activityGrid: ActivityLevel[]; countsByDay: Map<string, number> } {
  const countsByDay = new Map<string, number>();
  for (const r of reviews) {
    const d = new Date(r.reviewed_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = localDateKey(d);
    countsByDay.set(key, (countsByDay.get(key) ?? 0) + r.cards_reviewed);
  }

  const activityStart = new Date();
  activityStart.setDate(activityStart.getDate() - (days - 1));
  activityStart.setHours(0, 0, 0, 0);

  const accountStartKey = accountStart ? localDateKey(accountStart) : null;

  const activityGrid: ActivityLevel[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(activityStart);
    d.setDate(d.getDate() + i);
    const dayKey = localDateKey(d);
    if (accountStartKey && dayKey < accountStartKey) {
      activityGrid.push("empty");
    } else {
      activityGrid.push(countToLevel(countsByDay.get(dayKey) ?? 0));
    }
  }

  return { activityGrid, countsByDay };
}
