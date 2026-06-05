import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithFailover } from "@/lib/ai/router";
import { SCHEDULE_SYSTEM } from "@/lib/ai/prompts";
import { searchContent, formatRagContext } from "@/lib/vectors/search";
import { aggregateTopicStats } from "@/lib/topics/aggregate-topic-stats";
import { parseAiScheduleBlocks } from "@/lib/schedule/map-ai-blocks";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let day: number | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (body.day != null) day = Number(body.day);
  } catch {
    /* optional body */
  }

  try {
    const { data: plan } = await supabase
      .from("study_plans")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const topics = await aggregateTopicStats(supabase, user.id);
    const dueSummary = topics
      .filter((t) => t.due > 0)
      .map((t) => `${t.name}: ${t.due} due, ${t.mastery}% mastery`)
      .join("; ");

    const rag = await searchContent("weak areas study focus review", { userId: user.id });
    const planText = plan
      ? `Goal: ${plan.goal}. Level: ${plan.level}. Minutes/day: ${plan.minutes_per_day}. Study days (0=Sun): ${(plan.study_days ?? []).join(",")}.`
      : "Default balanced plan: 20 min/day, Mon–Fri.";

    const dayHint =
      day != null
        ? `Generate blocks for day ${day} only (0=Sunday).`
        : "Generate a full week (days 0–6).";

    const { text } = await generateWithFailover(
      `${planText}\nDue today by topic: ${dueSummary || "none"}.\n${dayHint}\n\nContext:\n${formatRagContext(rag)}\n\nReturn schedule JSON.`,
      { system: SCHEDULE_SYSTEM, json: true, route: "schedule-regenerate", userId: user.id }
    );

    const parsed = JSON.parse(text);
    const blocks = parseAiScheduleBlocks(parsed);

    if (blocks.length === 0) {
      return NextResponse.json({ error: "AI returned no valid blocks" }, { status: 500 });
    }

    return NextResponse.json({ schedule: { blocks } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Schedule generation failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
