import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestDocument } from "@/lib/vectors/ingest";
import { validateCardFields } from "@/lib/topics/validate-topic";

async function getTopicId(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  await supabase.from("card_scheduling").insert({
    card_id: card.id,
    user_id: user.id,
    due_at: new Date().toISOString(),
    mastery: 0,
  });

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
