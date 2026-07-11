import type { SupabaseClient } from "@supabase/supabase-js";
import { pickExtendedSettings } from "@/lib/profile/extended";
import { getReviewStats } from "@/lib/review/get-review-queue";
import { computeReviewStreak, reviewEventsToDateKeys } from "@/lib/review/streak";
import { aggregateTopicStats } from "@/lib/topics/aggregate-topic-stats";
import { searchContent, formatRagContext } from "@/lib/vectors/search";
import { DAY_LABELS, type ScheduleBlock } from "./types";
import { getSrsForecast } from "@/lib/srs/forecast";
import { minutesToHours } from "./preferences-schema";

export type ScheduleAiMode = "narrative" | "profile";
export type ScheduleAiScope = "day" | "week";

export type BuildScheduleAiContextOptions = {
  mode: ScheduleAiMode;
  scope: ScheduleAiScope;
  day?: number;
  narrativeOverride?: string;
  existingBlocks?: ScheduleBlock[];
};

export async function buildScheduleAiContext(
  supabase: SupabaseClient,
  userId: string,
  options: BuildScheduleAiContextOptions
): Promise<string> {
  const [{ data: plan }, { data: profile }, topics, stats, srsForecast] = await Promise.all([
    supabase
      .from("study_plans")
      .select(
        "goal, goal_template, level, hours_per_day, minutes_per_day, study_days, deadline, schedule_narrative"
      )
      .eq("user_id", userId)
      .single(),
    supabase.from("profiles").select("display_name, settings").eq("id", userId).single(),
    aggregateTopicStats(supabase, userId),
    getReviewStats(supabase, userId),
    getSrsForecast(supabase, userId, 7),
  ]);

  const extended = pickExtendedSettings(
    profile?.settings as Record<string, unknown> | undefined
  );

  const hoursPerDay =
    plan?.hours_per_day != null
      ? Number(plan.hours_per_day)
      : minutesToHours(plan?.minutes_per_day ?? 30);

  const dueTopics = topics
    .filter((t) => t.due > 0)
    .sort((a, b) => a.mastery - b.mastery);
  const weakTopics = [...topics].sort((a, b) => a.mastery - b.mastery).slice(0, 5);

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data: recentReviews } = await supabase
    .from("review_events")
    .select("reviewed_at, cards_reviewed")
    .eq("user_id", userId)
    .gte("reviewed_at", since.toISOString());

  const reviewDateSet = reviewEventsToDateKeys(recentReviews ?? []);
  const streak = computeReviewStreak(reviewDateSet);
  const reviewsLast7Days = (recentReviews ?? []).reduce((s, r) => s + r.cards_reviewed, 0);

  const rag = await searchContent("weak areas study focus review exam prep", {
    userId,
  });

  const studyDays = (plan?.study_days ?? [1, 2, 3, 4, 5]) as number[];
  const studyDayLabels = studyDays.map((d) => DAY_LABELS[d] ?? String(d)).join(", ");

  const sections: string[] = [
    "## Student profile",
    `Name: ${profile?.display_name ?? "Student"}`,
    `Timezone: ${extended.timezone ?? "not set"}`,
    `Primary goal (profile): ${extended.primaryGoal ?? plan?.goal ?? "General learning"}`,
    `Study plan goal: ${plan?.goal ?? "Build consistent retention habits"}`,
    `Level: ${plan?.level ?? "beginner"}`,
    `Study budget: ${hoursPerDay} hours per day on study days`,
    `Study days: ${studyDayLabels} (0=Sun)`,
    plan?.deadline ? `Deadline: ${plan.deadline}` : "Deadline: none set",
    plan?.goal_template ? `Goal template: ${plan.goal_template}` : "",
    "",
    "## Retention queue (prioritize these in review/recall blocks)",
    `Total cards due now: ${stats.totalDue}`,
    `Current review streak: ${streak} consecutive day(s)`,
    `Cards reviewed in last 7 days: ${reviewsLast7Days}`,
    dueTopics.length
      ? dueTopics.map((t) => `- ${t.name}: ${t.due} due, ${t.mastery}% mastery`).join("\n")
      : "- No cards due today",
    "",
    "## SM-2 forecast (next 7 days — align review/learn blocks with this)",
    srsForecast
      .filter((d) => d.totalDue > 0)
      .map(
        (d) =>
          `- ${d.date}: ${d.reviewDue} reviews, ${d.newDue} new (~${d.estimatedMinutes} min)`
      )
      .join("\n") || "- No scheduled load in the next week",
    "",
    "## Weakest topics (weight learn/recall blocks here)",
    weakTopics.length
      ? weakTopics.map((t) => `- ${t.name}: ${t.mastery}% mastery, ${t.due} due`).join("\n")
      : "- No topics yet",
    "",
    "## Knowledge context",
    formatRagContext(rag) || "No extra context.",
  ].filter(Boolean);

  if (options.mode === "narrative") {
    const narrative =
      options.narrativeOverride?.trim() ||
      plan?.schedule_narrative?.trim() ||
      "";
    sections.push(
      "",
      "## User day/week description (follow closely)",
      narrative ||
        "No description provided — infer reasonable routine from profile and retention data."
    );
  } else {
    sections.push(
      "",
      "## Planning mode",
      "User did not provide a custom day description. Build a full-day schedule from profile, study days, hours budget, and retention queue.",
      `Allocate ~${hoursPerDay}h across review, recall, and learn blocks on study days.`,
      "On non-study days, minimize study blocks but keep life structure (work, personal, rest)."
    );
  }

  if (options.scope === "day" && options.day != null) {
    sections.push(
      "",
      "## Scope: single day only",
      `Generate blocks for ${DAY_LABELS[options.day]} (day index ${options.day}) only.`
    );
  } else {
    sections.push(
      "",
      "## Scope: full week",
      "Generate blocks for days 0–6 (Sunday through Saturday).",
      `Heavier study blocks on: ${studyDayLabels}. Lighter on other days.`
    );
  }

  if (options.existingBlocks?.length) {
    sections.push(
      "",
      "## Existing blocks for this day (keep unless narrative overrides)",
      options.existingBlocks
        .map((b) => `- ${b.start}-${b.end} [${b.kind}] ${b.title}`)
        .join("\n")
    );
  }

  return sections.join("\n");
}
