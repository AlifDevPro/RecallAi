import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestDocument } from "@/lib/vectors/ingest";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  let count = 0;

  const { data: cards } = await service
    .from("cards")
    .select("id, front, back, topic_id, topics(name, slug)")
    .eq("user_id", user.id);

  for (const card of cards ?? []) {
    const topic = card.topics as { name?: string; slug?: string } | null;
    await ingestDocument({
      sourceType: "card",
      sourceId: card.id,
      userId: user.id,
      title: card.front,
      text: `${card.front}\n${card.back}`,
      metadata: { visibility: "private", topicSlug: topic?.slug },
    });
    count++;
  }

  const { data: insight } = await service
    .from("user_insights")
    .select("body")
    .eq("user_id", user.id)
    .single();

  if (insight?.body) {
    await ingestDocument({
      sourceType: "insight",
      sourceId: user.id,
      userId: user.id,
      title: "Insight",
      text: insight.body,
      metadata: { visibility: "private" },
    });
    count++;
  }

  return NextResponse.json({ reindexed: count });
}
