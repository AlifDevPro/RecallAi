import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/route-auth";
import { ingestDocument } from "@/lib/vectors/ingest";
import {
  buildSchedulingInsert,
  dueAtForNewCard,
  insertCardScheduling,
} from "@/lib/srs/introduce-cards";
import { validateCardFields } from "@/lib/topics/validate-topic";

async function getTopicId(
  supabase: SupabaseClient,
  userId: string,
  slug: string
) {
  const { data } = await supabase
    .from("topics")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", slug)
    .single();
  return data?.id ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const topicId = await getTopicId(supabase, user.id, slug);
  if (!topicId) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const body = await request.json();
  const front = (body.front as string)?.trim();
  const back = (body.back as string)?.trim() ?? "";

  const cardError = validateCardFields(front ?? "", back);
  if (cardError) {
    return NextResponse.json({ error: cardError }, { status: 400 });
  }

  const { data: card, error } = await supabase
    .from("cards")
    .insert({ topic_id: topicId, user_id: user.id, front, back })
    .select("id")
    .single();

  if (error || !card) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });
  }

  const dueAt = await dueAtForNewCard(supabase, user.id);
  await insertCardScheduling(supabase, buildSchedulingInsert(card.id, user.id, dueAt));

  await ingestDocument({
    sourceType: "card",
    sourceId: card.id,
    userId: user.id,
    title: front,
    text: `${front}\n${back}`,
    metadata: { visibility: "private", topicSlug: slug },
  });

  return NextResponse.json({ cardId: card.id });
}
