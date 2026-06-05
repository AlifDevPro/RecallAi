import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nextScheduling, type ReviewRating } from "@/lib/srs/update-scheduling";
import { RATING_INTERVAL_DAYS } from "@/lib/srs/format-interval";
import { ingestDocument } from "@/lib/vectors/ingest";

const VALID_RATINGS: ReviewRating[] = ["again", "hard", "good", "easy"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const { data: sched, error: schedError } = await supabase
    .from("card_scheduling")
    .select("mastery, due_at")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .single();

  if (schedError || !sched) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const update = nextScheduling(rating, {
    mastery: Number(sched.mastery),
    due_at: sched.due_at,
  });

  const { error: updateError } = await supabase
    .from("card_scheduling")
    .update(update)
    .eq("card_id", cardId)
    .eq("user_id", user.id);

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
    await ingestDocument({
      sourceType: "card",
      sourceId: cardId,
      userId: user.id,
      title: card.front,
      text: `${card.front}\n${card.back}`,
      metadata: { visibility: "private" },
    });
  }

  return NextResponse.json({
    ok: true,
    nextDueAt: update.due_at,
    nextMastery: update.mastery,
    intervalDays: RATING_INTERVAL_DAYS[rating],
  });
}
