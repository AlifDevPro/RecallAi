import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api/log-route-error";
import { requireUser } from "@/lib/supabase/route-auth";
import { aggregateTopicStats } from "@/lib/topics/aggregate-topic-stats";
import { ingestDocument } from "@/lib/vectors/ingest";
import {
  buildSchedulingInsert,
  getNewCardsBudget,
  insertCardScheduling,
  staggerNewCardDueDates,
} from "@/lib/srs/introduce-cards";
import {
  resolveUniqueSlug,
  slugifyTopicName,
  validateCardFields,
  validateTopicName,
} from "@/lib/topics/validate-topic";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  try {
    const topics = await aggregateTopicStats(supabase, user.id);
    return NextResponse.json({ topics });
  } catch (e) {
    logRouteError("GET /api/me/topics", e, { userId: user.id });
    const message = e instanceof Error ? e.message : "Failed to load topics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json();
  const topic = (body.topic as string)?.trim();
  const description = (body.description as string)?.trim() ?? topic;
  const cards = (body.cards ?? []) as { front: string; back: string }[];

  const nameError = validateTopicName(topic ?? "");
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 });
  }
  if (!cards.length) {
    return NextResponse.json({ error: "At least one card required" }, { status: 400 });
  }

  for (const card of cards) {
    const cardError = validateCardFields(card.front ?? "", card.back ?? "");
    if (cardError) {
      return NextResponse.json({ error: cardError }, { status: 400 });
    }
  }

  const baseSlug = slugifyTopicName(topic);
  const slug = await resolveUniqueSlug(supabase, user.id, baseSlug);

  const { data: topicRow, error: topicError } = await supabase
    .from("topics")
    .insert({ user_id: user.id, name: topic, slug, status: "active" })
    .select("id")
    .single();

  if (topicError || !topicRow) {
    logRouteError("POST /api/me/topics insert", topicError, { userId: user.id });
    return NextResponse.json({ error: topicError?.message ?? "Failed to create topic" }, { status: 500 });
  }

  const newPerDay = await getNewCardsBudget(supabase, user.id);
  const dueDates = staggerNewCardDueDates(cards.length, { newPerDay });

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const { data: c } = await supabase
      .from("cards")
      .insert({
        topic_id: topicRow.id,
        user_id: user.id,
        front: card.front.trim(),
        back: card.back.trim(),
      })
      .select("id")
      .single();

    if (c) {
      await insertCardScheduling(
        supabase,
        buildSchedulingInsert(c.id, user.id, dueDates[i] ?? new Date().toISOString())
      );
      await ingestDocument({
        sourceType: "card",
        sourceId: c.id,
        userId: user.id,
        title: card.front,
        text: `${card.front}\n${card.back}`,
        metadata: { visibility: "private", topicSlug: slug },
      });
    }
  }

  await ingestDocument({
    sourceType: "topic",
    sourceId: slug,
    userId: user.id,
    title: topic,
    text: `${topic}\n${description}`,
    metadata: { visibility: "private" },
  });

  return NextResponse.json({ topicId: topicRow.id, slug, cardCount: cards.length });
}
