import type { TutorDebugMeta } from "./types";

const DEBUG = process.env.TUTOR_DEBUG === "true";

export function logTutorTurn(event: string, data: Record<string, unknown>) {
  if (!DEBUG && event !== "tutor.error") return;
  console.info(`[tutor] ${event}`, JSON.stringify(data));
}

export function logTutorDebug(meta: TutorDebugMeta) {
  if (!DEBUG) return;
  console.info("[tutor] debug", JSON.stringify(meta));
}

export function isTutorDebugEnabled(): boolean {
  return DEBUG;
}
