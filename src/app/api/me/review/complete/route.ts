import { NextResponse } from "next/server";
import {
  nextScheduling,
  parseSchedulingRow,
  previewIntervalDays,
  type ReviewRating,
} from "@/lib/srs/update-scheduling";
import { requireUser } from "@/lib/supabase/route-auth";
import { ingestDocument } from "@/lib/vectors/ingest";

const VALID_RATINGS: ReviewRating[] = ["again", "hard", "good", "easy"];

const SCHEDULING_COLUMNS =
  "mastery, due_at, easiness, interval_days, repetitions, lapse_count, last_reviewed_at";

async function loadScheduling(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  cardId: string,
  userId: string
) {
  let { data: sched, error } = await supabase
    .from("card_scheduling")
    .select(SCHEDULING_COLUMNS)
    .eq("card_id", cardId)
    .eq("user_id", userId)
    .single();

  if (error?.message?.includes("easiness") || error?.message?.includes("repetitions")) {
    const fallback = await supabase
      .from("card_scheduling")
      .select("mastery, due_at, last_reviewed_at")
      .eq("card_id", cardId)
      .eq("user_id", userId)
      .single();
    sched = fallback.data
      ? {
          ...fallback.data,
          easiness: 2.5,
          interval_days: 0,
          repetitions: Number(fallback.data.mastery) > 0 ? 1 : 0,
          lapse_count: 0,
        }
      : null;
    error = fallback.error;
  }

  return { sched, error };
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json();
  const cardId = body.cardId as string;
  const rating = body.rating as ReviewRating;

  if (!cardId || !rating) {
    return NextResponse.json({ error: "cardId and rating required" }, { status: 400 });
  }

  if (!VALID_RATINGS.includes(rating)) {
    return NextResponse.json(
      { error: "rating must be one of: again, hard, good, easy" },
      { status: 400 }
    );
  }

  const { sched, error: schedError } = await loadScheduling(supabase, cardId, user.id);

  if (schedError || !sched) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const current = parseSchedulingRow(sched as Record<string, unknown>);
  const update = nextScheduling(rating, current);

  let { error: updateError } = await supabase
    .from("card_scheduling")
    .update(update)
    .eq("card_id", cardId)
    .eq("user_id", user.id);

  if (updateError?.message?.includes("easiness") || updateError?.message?.includes("repetitions")) {
    const legacy = await supabase
      .from("card_scheduling")
      .update({
        mastery: update.mastery,
        mastery_7d_ago: update.mastery_7d_ago,
        due_at: update.due_at,
        last_reviewed_at: update.last_reviewed_at,
      })
      .eq("card_id", cardId)
      .eq("user_id", user.id);
    updateError = legacy.error;
  }

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: eventError } = await supabase.from("review_events").insert({
    user_id: user.id,
    cards_reviewed: 1,
  });

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  const { data: card } = await supabase
    .from("cards")
    .select("front, back")
    .eq("id", cardId)
    .single();

  if (card) {
    void ingestDocument({
      sourceType: "card",
      sourceId: cardId,
      userId: user.id,
      title: card.front,
      text: `${card.front}\n${card.back}`,
      metadata: { visibility: "private" },
    }).catch((err) => {
      console.error("review ingest failed:", err);
    });
  }

  return NextResponse.json({
    ok: true,
    nextDueAt: update.due_at,
    nextMastery: update.mastery,
    intervalDays: update.interval_days,
    repetitions: update.repetitions,
    easiness: update.easiness,
    previews: {
      again: previewIntervalDays(current, "again"),
      hard: previewIntervalDays(current, "hard"),
      good: previewIntervalDays(current, "good"),
      easy: previewIntervalDays(current, "easy"),
    },
  });
}
