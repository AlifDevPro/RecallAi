import { BLOCK_KINDS, type ScheduleBlockInput } from "./types";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function minutesOf(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function blockRange(block: ScheduleBlockInput): { start: number; end: number } {
  const start = minutesOf(block.start);
  let end = minutesOf(block.end);
  if (end <= start && block.kind === "sleep") {
    end += 24 * 60;
  }
  return { start, end };
}

function rangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start < b.end && b.start < a.end;
}

export function validateScheduleBlocks(
  day: number,
  blocks: ScheduleBlockInput[]
): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return { ok: false, error: "day must be 0–6 (Sunday–Saturday)" };
  }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (!b.title?.trim()) {
      return { ok: false, error: `Block ${i + 1}: title is required` };
    }
    if (b.title.length > 200) {
      return { ok: false, error: `Block ${i + 1}: title too long` };
    }
    if (!BLOCK_KINDS.includes(b.kind as (typeof BLOCK_KINDS)[number])) {
      return { ok: false, error: `Block ${i + 1}: invalid kind "${b.kind}"` };
    }
    if (!TIME_RE.test(b.start) || !TIME_RE.test(b.end)) {
      return { ok: false, error: `Block ${i + 1}: times must be HH:MM (24h)` };
    }
    const { start, end } = blockRange(b);
    if (b.kind !== "sleep" && end <= start) {
      return { ok: false, error: `Block ${i + 1}: end must be after start` };
    }
  }

  const ranges = blocks.map((b) => blockRange(b));
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (rangesOverlap(ranges[i], ranges[j])) {
        return { ok: false, error: `Blocks "${blocks[i].title}" and "${blocks[j].title}" overlap` };
      }
    }
  }

  return { ok: true };
}

export function normalizeTime(value: string): string {
  const parts = value.split(":");
  if (parts.length < 2) return value;
  const h = parts[0].padStart(2, "0");
  const m = parts[1].padStart(2, "0");
  return `${h}:${m}`;
}
