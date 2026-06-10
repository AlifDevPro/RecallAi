import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/route-auth";
import { validateScheduleBlocks } from "@/lib/schedule/validate-blocks";
import type { ScheduleBlockInput } from "@/lib/schedule/types";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const dayParam = new URL(request.url).searchParams.get("day");
  let query = supabase
    .from("schedule_blocks")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order");

  if (dayParam != null) {
    query = query.eq("day", Number(dayParam));
  }

  const { data: blocks, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    blocks: (blocks ?? []).map((b) => ({
      id: b.id,
      day: b.day,
      start: b.start_time,
      end: b.end_time,
      title: b.title,
      kind: b.kind,
      detail: b.detail,
      done: b.done,
      ai: b.ai_generated,
    })),
  });
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  let body: { day?: number; blocks?: ScheduleBlockInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const day = Number(body.day ?? 0);
  const blocks = body.blocks ?? [];

  const validation = validateScheduleBlocks(day, blocks);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("schedule_blocks")
    .delete()
    .eq("user_id", user.id)
    .eq("day", day);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (blocks.length > 0) {
    const rows = blocks.map((b, i) => ({
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

    const { error: insertError } = await supabase.from("schedule_blocks").insert(rows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
