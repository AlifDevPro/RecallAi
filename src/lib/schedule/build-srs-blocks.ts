import type { ScheduleBlock } from "./types";
import type { SrsDayForecast } from "@/lib/srs/forecast";

export type SrsBlockMeta = {
  srs: true;
  topicSlug?: string;
  reviewDue: number;
  newDue: number;
  href: string;
};

export function parseSrsBlockDetail(detail?: string): SrsBlockMeta | null {
  if (!detail?.trim()) return null;
  try {
    const parsed = JSON.parse(detail) as SrsBlockMeta;
    if (parsed?.srs === true) return parsed;
  } catch {
    /* plain text detail */
  }
  return null;
}

export function formatSrsBlockDetail(meta: SrsBlockMeta): string {
  return JSON.stringify(meta);
}

export function formatSrsBlockDisplay(meta: SrsBlockMeta): string {
  const parts: string[] = [];
  if (meta.reviewDue > 0) {
    parts.push(`${meta.reviewDue} review${meta.reviewDue !== 1 ? "s" : ""}`);
  }
  if (meta.newDue > 0) {
    parts.push(`${meta.newDue} new`);
  }
  return parts.join(" · ") || "SM-2 scheduled";
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function blockId(prefix: string, day: number, index: number): string {
  return `srs-${prefix}-d${day}-${index}`;
}

/**
 * Build review + learn blocks for one calendar day from SM-2 forecast.
 */
export function buildSrsBlocksForDay(
  dayIndex: number,
  forecast: SrsDayForecast,
  options: { isStudyDay: boolean; startHour?: string }
): ScheduleBlock[] {
  if (!options.isStudyDay && forecast.totalDue === 0) return [];

  const blocks: ScheduleBlock[] = [];
  let cursor = options.startHour ?? "08:00";

  if (forecast.reviewDue > 0) {
    const minutes = Math.max(15, Math.min(90, forecast.reviewDue * 1));
    const end = addMinutes(cursor, minutes);
    const weakest = forecast.byTopic.find((t) => t.reviewDue > 0);
    const limit = Math.min(50, forecast.reviewDue);
    const href = weakest
      ? `/review?topic=${encodeURIComponent(weakest.slug)}&limit=${limit}`
      : `/review?limit=${limit}`;

    blocks.push({
      id: blockId("review", dayIndex, 0),
      start: cursor,
      end,
      title: `SM-2 review · ${forecast.reviewDue} card${forecast.reviewDue !== 1 ? "s" : ""}`,
      kind: "review",
      detail: formatSrsBlockDetail({
        srs: true,
        topicSlug: weakest?.slug,
        reviewDue: forecast.reviewDue,
        newDue: 0,
        href,
      }),
      done: false,
      ai: false,
    });
    cursor = end;
  }

  if (forecast.newDue > 0) {
    const minutes = Math.max(15, Math.min(60, forecast.newDue * 1));
    const end = addMinutes(cursor, minutes + 10);
    const learnTopic = forecast.byTopic.find((t) => t.newDue > 0);
    const href = learnTopic
      ? `/review?topic=${encodeURIComponent(learnTopic.slug)}&mode=preview&limit=${learnTopic.newDue}`
      : `/review?mode=preview&limit=${forecast.newDue}`;

    blocks.push({
      id: blockId("learn", dayIndex, 1),
      start: addMinutes(cursor, 5),
      end,
      title: learnTopic
        ? `Learn new · ${learnTopic.name} (${forecast.newDue})`
        : `Learn new cards (${forecast.newDue})`,
      kind: "learn",
      detail: formatSrsBlockDetail({
        srs: true,
        topicSlug: learnTopic?.slug,
        reviewDue: 0,
        newDue: forecast.newDue,
        href,
      }),
      done: false,
      ai: false,
    });
  }

  return blocks;
}

export function mergeSrsBlocks(
  existing: ScheduleBlock[],
  srsBlocks: ScheduleBlock[]
): ScheduleBlock[] {
  const kept = existing.filter((b) => !parseSrsBlockDetail(b.detail));
  const merged = [...kept, ...srsBlocks];
  merged.sort((a, b) => a.start.localeCompare(b.start));
  return merged;
}
