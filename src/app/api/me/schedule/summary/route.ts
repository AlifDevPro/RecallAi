import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/route-auth";
import { getScheduleSummary } from "@/lib/schedule/get-schedule-summary";
import type { ScheduleBlock } from "@/lib/schedule/types";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const params = new URL(request.url).searchParams;
  const day = Number(params.get("day") ?? new Date().getDay());

  const { data: rows, error } = await supabase
    .from("schedule_blocks")
    .select("*")
    .eq("user_id", user.id)
    .eq("day", day)
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const blocks: ScheduleBlock[] = (rows ?? []).map((b) => ({
    id: b.id,
    start: b.start_time,
    end: b.end_time,
    title: b.title,
    kind: b.kind,
    detail: b.detail,
    done: b.done,
    ai: b.ai_generated,
  }));

  const summary = await getScheduleSummary(supabase, user.id, blocks, day);
  return NextResponse.json(summary);
}
