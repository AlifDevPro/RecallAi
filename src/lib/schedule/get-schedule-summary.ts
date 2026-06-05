import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateTopicStats } from "@/lib/topics/aggregate-topic-stats";
import type { ScheduleBlock, ScheduleSummary } from "./types";
import { minutesOf } from "./validate-blocks";

export async function getScheduleSummary(
  supabase: SupabaseClient,
  userId: string,
  blocks: ScheduleBlock[],
  selectedDay: number
): Promise<ScheduleSummary> {
  const topics = await aggregateTopicStats(supabase, userId);
  const cardsDue = topics.reduce((s, t) => s + t.due, 0);
  const topicsWithDue = topics.filter((t) => t.due > 0).length;

  let wakeTime: string | null = null;
  let sleepTime: string | null = null;
  if (blocks.length > 0) {
    const nonSleep = blocks.filter((b) => b.kind !== "sleep");
    const starts = (nonSleep.length ? nonSleep : blocks).map((b) => b.start);
    const ends = blocks.map((b) => b.end);
    wakeTime = starts.sort()[0] ?? null;
    sleepTime = ends.sort().reverse()[0] ?? null;
  }

  const activeWindowMinutes =
    wakeTime && sleepTime
      ? Math.max(0, minutesOf(sleepTime) - minutesOf(wakeTime))
      : null;

  const tomorrowDay = (selectedDay + 1) % 7;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const { data: topicRows } = await supabase
    .from("topics")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active");

  const topicIds = (topicRows ?? []).map((t) => t.id);
  let tomorrowDue = 0;

  if (topicIds.length > 0) {
    const { data: cards } = await supabase
      .from("cards")
      .select("id")
      .eq("user_id", userId)
      .in("topic_id", topicIds);

    const cardIds = (cards ?? []).map((c) => c.id);
    if (cardIds.length > 0) {
      const { data: sched } = await supabase
        .from("card_scheduling")
        .select("due_at")
        .eq("user_id", userId)
        .in("card_id", cardIds)
        .gte("due_at", tomorrow.toISOString())
        .lt("due_at", tomorrowEnd.toISOString());

      tomorrowDue = sched?.length ?? 0;
    }
  }

  const { data: plan } = await supabase
    .from("study_plans")
    .select("minutes_per_day, study_days, goal")
    .eq("user_id", userId)
    .single();

  const { data: insightRow } = await supabase
    .from("user_insights")
    .select("body")
    .eq("user_id", userId)
    .single();

  const weakest = [...topics].sort((a, b) => a.mastery - b.mastery)[0];
  const defaultInsight = weakest
    ? `You have ${cardsDue} cards due today. Focus on ${weakest.name} (${weakest.mastery}% mastery) during your review blocks.`
    : cardsDue > 0
      ? `You have ${cardsDue} cards due today. Schedule a review block when your energy is highest.`
      : "You're caught up on reviews. Use today's learning blocks to get ahead.";

  const insight = insightRow?.body?.trim()
    ? insightRow.body.trim().slice(0, 280)
    : defaultInsight;

  const { data: tomorrowBlocks } = await supabase
    .from("schedule_blocks")
    .select("title, kind, start_time")
    .eq("user_id", userId)
    .eq("day", tomorrowDay)
    .order("sort_order");

  const tomorrowPreview: ScheduleSummary["tomorrowPreview"] = [];
  if (tomorrowDue > 0) {
    tomorrowPreview.push({
      label: `${tomorrowDue} cards due tomorrow`,
      tone: "primary",
    });
  }
  for (const b of tomorrowBlocks ?? []) {
    if (b.kind === "learn") {
      tomorrowPreview.push({ label: `New learning: ${b.title}`, tone: "accent" });
    } else if (b.kind === "recall") {
      tomorrowPreview.push({
        label: `Recall at ${b.start_time}: ${b.title}`,
        tone: "good",
      });
    }
    if (tomorrowPreview.length >= 3) break;
  }
  if (tomorrowPreview.length === 0) {
    tomorrowPreview.push({
      label: tomorrowDue > 0 ? "Review queue building for tomorrow" : "No blocks scheduled yet for tomorrow",
      tone: "primary",
    });
  }

  return {
    cardsDue,
    topicsWithDue,
    wakeTime,
    sleepTime,
    activeWindowMinutes,
    tomorrowDue,
    insight,
    studyPlan: {
      minutesPerDay: plan?.minutes_per_day ?? 20,
      studyDays: plan?.study_days ?? [1, 2, 3, 4, 5],
    },
    tomorrowPreview,
  };
}
