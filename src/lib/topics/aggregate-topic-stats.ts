import type { SupabaseClient } from "@supabase/supabase-js";

export type TopicListItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  mastery: number;
  cards: number;
  due: number;
  status: "active" | "archived";
  trend: "up" | "down" | "stable";
};

function computeTrend(current: number, prior: number | null): TopicListItem["trend"] {
  if (prior == null) return "stable";
  const diff = current - prior;
  if (diff > 2) return "up";
  if (diff < -2) return "down";
  return "stable";
}

export async function aggregateTopicStats(
  supabase: SupabaseClient,
  userId: string
): Promise<TopicListItem[]> {
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, slug, status")
    .eq("user_id", userId)
    .order("name");

  if (!topics?.length) return [];

  const topicIds = topics.map((t) => t.id);
  const now = new Date().toISOString();

  const { data: cards } = await supabase
    .from("cards")
    .select("id, topic_id")
    .eq("user_id", userId)
    .in("topic_id", topicIds);

  const cardIds = (cards ?? []).map((c) => c.id);
  let scheduling: {
    card_id: string;
    due_at: string;
    mastery: number;
    mastery_7d_ago: number | null;
  }[] = [];

  if (cardIds.length > 0) {
    const { data } = await supabase
      .from("card_scheduling")
      .select("card_id, due_at, mastery, mastery_7d_ago")
      .eq("user_id", userId)
      .in("card_id", cardIds);
    scheduling = (data ?? []) as typeof scheduling;
  }

  const schedByCard = new Map(scheduling.map((s) => [s.card_id, s]));
  const cardsByTopic = new Map<string, string[]>();
  for (const c of cards ?? []) {
    const list = cardsByTopic.get(c.topic_id) ?? [];
    list.push(c.id);
    cardsByTopic.set(c.topic_id, list);
  }

  return topics.map((t) => {
    const cardList = cardsByTopic.get(t.id) ?? [];
    let due = 0;
    let masterySum = 0;
    let trendSum = 0;
    let trendCount = 0;

    for (const cardId of cardList) {
      const s = schedByCard.get(cardId);
      if (!s) continue;
      if (s.due_at <= now) due++;
      masterySum += Number(s.mastery);
      const trend = computeTrend(Number(s.mastery), s.mastery_7d_ago);
      if (trend === "up") trendSum++;
      else if (trend === "down") trendSum--;
      trendCount++;
    }

    const mastery = cardList.length ? Math.round(masterySum / cardList.length) : 0;
    const trend: TopicListItem["trend"] =
      trendCount === 0 ? "stable" : trendSum > 0 ? "up" : trendSum < 0 ? "down" : "stable";

    return {
      id: t.slug,
      slug: t.slug,
      name: t.name,
      category: `${cardList.length} cards`,
      mastery,
      cards: cardList.length,
      due,
      status: t.status as "active" | "archived",
      trend,
    };
  });
}
