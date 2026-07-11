import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/route-auth";
import { getSrsForecast } from "@/lib/srs/forecast";
import {
  buildSrsBlocksForDay,
  mergeSrsBlocks,
  parseSrsBlockDetail,
} from "@/lib/schedule/build-srs-blocks";
import type { ScheduleBlock } from "@/lib/schedule/types";

function getWeekStart(weekOffset: number): Date {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json().catch(() => ({}));
  const weekOffset = Number(body.weekOffset) || 0;

  const { data: plan } = await supabase
    .from("study_plans")
    .select("study_days")
    .eq("user_id", user.id)
    .single();

  const studyDays = (plan?.study_days ?? [1, 2, 3, 4, 5]) as number[];
  const weekStart = getWeekStart(weekOffset);
  const forecast = await getSrsForecast(supabase, user.id, 7, weekStart);

  const results: { day: number; blocks: number }[] = [];

  for (let day = 0; day < 7; day++) {
    const dayForecast = forecast[day];
    if (!dayForecast) continue;

    const isStudyDay = studyDays.includes(day);
    const srsBlocks = buildSrsBlocksForDay(day, dayForecast, { isStudyDay });

    const { data: existingRows } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("user_id", user.id)
      .eq("day", day)
      .order("sort_order");

    const existing: ScheduleBlock[] = (existingRows ?? []).map((b) => ({
      id: b.id,
      start: b.start_time,
      end: b.end_time,
      title: b.title,
      kind: b.kind,
      detail: b.detail ?? undefined,
      done: b.done,
      ai: b.ai_generated,
    }));

    const merged = mergeSrsBlocks(existing, srsBlocks);

    if (srsBlocks.length === 0 && !existing.some((b) => parseSrsBlockDetail(b.detail))) {
      continue;
    }

    await supabase.from("schedule_blocks").delete().eq("user_id", user.id).eq("day", day);

    if (merged.length > 0) {
      const rows = merged.map((b, i) => ({
        user_id: user.id,
        day,
        start_time: b.start,
        end_time: b.end,
        title: b.title.trim(),
        kind: b.kind,
        detail: b.detail ?? "",
        done: b.done ?? false,
        ai_generated: b.ai ?? false,
        sort_order: i,
      }));
      const { error } = await supabase.from("schedule_blocks").insert(rows);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    results.push({ day, blocks: merged.length });
  }

  return NextResponse.json({
    ok: true,
    syncedDays: results.length,
    forecast: forecast.map((f) => ({
      date: f.date,
      reviewDue: f.reviewDue,
      newDue: f.newDue,
      totalDue: f.totalDue,
    })),
  });
}
