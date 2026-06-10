import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/route-auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, slug, status")
    .eq("user_id", user.id);

  const topicIds = (topics ?? []).map((t) => t.id);
  if (!topicIds.length) {
    return NextResponse.json({ exportedAt: new Date().toISOString(), topics: [], cards: [] });
  }

  const { data: cards, error } = await supabase
    .from("cards")
    .select("id, topic_id, front, back, created_at")
    .eq("user_id", user.id)
    .in("topic_id", topicIds)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const topicById = new Map((topics ?? []).map((t) => [t.id, t]));
  const payload = {
    exportedAt: new Date().toISOString(),
    topics: topics ?? [],
    cards: (cards ?? []).map((c) => ({
      ...c,
      topicSlug: topicById.get(c.topic_id)?.slug,
      topicName: topicById.get(c.topic_id)?.name,
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="recall-cards-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
