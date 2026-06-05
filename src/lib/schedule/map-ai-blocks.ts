import type { AiScheduleBlock, BlockKind, ScheduleBlock } from "./types";
import { BLOCK_KINDS } from "./types";
import { normalizeTime } from "./validate-blocks";

export function parseAiScheduleBlocks(raw: unknown): AiScheduleBlock[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as { blocks?: unknown };
  if (!Array.isArray(obj.blocks)) return [];

  const result: AiScheduleBlock[] = [];
  for (const item of obj.blocks) {
    if (!item || typeof item !== "object") continue;
    const b = item as Record<string, unknown>;
    const day = Number(b.day);
    const start = typeof b.start === "string" ? normalizeTime(b.start) : "";
    const end = typeof b.end === "string" ? normalizeTime(b.end) : "";
    const title = typeof b.title === "string" ? b.title.trim() : "";
    const kind = typeof b.kind === "string" ? b.kind : "review";
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    if (!title || !start || !end) continue;
    if (!BLOCK_KINDS.includes(kind as BlockKind)) continue;
    result.push({
      day,
      start,
      end,
      title,
      kind: kind as BlockKind,
      detail: typeof b.detail === "string" ? b.detail : undefined,
      ai: b.ai !== false,
    });
  }
  return result;
}

export function aiBlocksToScheduleBlocks(
  aiBlocks: AiScheduleBlock[],
  day: number
): ScheduleBlock[] {
  return aiBlocks
    .filter((b) => b.day === day)
    .map((b) => ({
      id: crypto.randomUUID(),
      start: b.start,
      end: b.end,
      title: b.title,
      kind: b.kind,
      detail: b.detail,
      ai: b.ai ?? true,
      done: false,
    }))
    .sort((a, c) => a.start.localeCompare(c.start));
}
