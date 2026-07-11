import type { RecentQuizSession } from "./learner-context";

export const LAST_QUIZ_STORAGE_KEY = "recall.quiz.last";

export function loadLastQuizSession(): RecentQuizSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_QUIZ_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RecentQuizSession;
  } catch {
    return null;
  }
}

export function saveLastQuizSession(session: RecentQuizSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_QUIZ_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota */
  }
}
