import type { SupabaseClient } from "@supabase/supabase-js";
import { fixtureTopics } from "@/lib/data/dashboard.fixtures";
import { ingestDocument } from "@/lib/vectors/ingest";

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeds demo topics, cards, scheduling, review events, and insight for a new user. */
export async function seedUserDashboardData(
  supabase: SupabaseClient,
  userId: string
) {
  const existing = await supabase.from("topics").select("id").eq("user_id", userId).limit(1);
  if (existing.data && existing.data.length > 0) return;

  const now = new Date();
  const topicRows: { id: string; slug: string; fixture: (typeof fixtureTopics)[0] }[] = [];

  for (const fixture of fixtureTopics) {
    const slug = slugify(fixture.name);
    const { data: topic, error } = await supabase
      .from("topics")
      .insert({ user_id: userId, name: fixture.name, slug, status: "active" })
      .select("id")
      .single();
    if (error || !topic) throw error ?? new Error("Failed to insert topic");
    topicRows.push({ id: topic.id, slug, fixture });
  }

  for (const { id: topicId, fixture } of topicRows) {
    const cardCount = fixture.cards;
    const dueCount = fixture.due;
    const cardsToInsert = Array.from({ length: cardCount }, (_, i) => ({
      topic_id: topicId,
      user_id: userId,
      front: `${fixture.name} card ${i + 1}`,
      back: `Answer ${i + 1}`,
    }));

    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .insert(cardsToInsert)
      .select("id");
    if (cardsError || !cards) throw cardsError ?? new Error("Failed to insert cards");

    const scheduling = cards.map((card, i) => {
      const isDue = i < dueCount;
      const dueAt = isDue
        ? new Date(now.getTime() - i * 3600_000)
        : new Date(now.getTime() + (i - dueCount + 1) * 86400_000);
      const trendOffset =
        fixture.trend === "up" ? 5 : fixture.trend === "down" ? -8 : 0;
      return {
        card_id: card.id,
        user_id: userId,
        due_at: dueAt.toISOString(),
        mastery: fixture.mastery + (i % 3) - 1,
        mastery_7d_ago: fixture.mastery + trendOffset,
        last_reviewed_at: isDue ? null : now.toISOString(),
      };
    });

    const { error: schedError } = await supabase.from("card_scheduling").insert(scheduling);
    if (schedError) throw schedError;
  }

  const rand = mulberry32(20260604);
  const reviewEvents: { user_id: string; reviewed_at: string; cards_reviewed: number }[] = [];
  for (let dayOffset = 89; dayOffset >= 0; dayOffset--) {
    const r = rand();
    let count = 0;
    if (r > 0.85) count = 12 + Math.floor(rand() * 8);
    else if (r > 0.6) count = 5 + Math.floor(rand() * 5);
    else if (r > 0.35) count = 1 + Math.floor(rand() * 3);
    if (count > 0) {
      const d = new Date(now);
      d.setDate(d.getDate() - dayOffset);
      d.setHours(12, 0, 0, 0);
      reviewEvents.push({
        user_id: userId,
        reviewed_at: d.toISOString(),
        cards_reviewed: count,
      });
    }
  }
  if (reviewEvents.length > 0) {
    const { error: revError } = await supabase.from("review_events").insert(reviewEvents);
    if (revError) throw revError;
  }

  const weakest = [...fixtureTopics].sort((a, b) => a.mastery - b.mastery)[0];
  const totalDue = fixtureTopics.reduce((s, t) => s + t.due, 0);
  const insight = `Your ${weakest.name} deck is trending ${weakest.trend === "down" ? "down" : "steady"} at ${weakest.mastery}% mastery. With ${totalDue} cards due today, prioritize a 20-minute session on weak areas before expanding new material.`;

  await supabase.from("user_insights").upsert({
    user_id: userId,
    body: insight,
    generated_at: now.toISOString(),
  });

  for (const { slug, fixture } of topicRows) {
    await ingestDocument({
      sourceType: "topic",
      sourceId: slug,
      userId,
      title: fixture.name,
      text: `${fixture.name} study deck with ${fixture.cards} cards`,
      metadata: { visibility: "private" },
    });
  }

  const { data: allCards } = await supabase
    .from("cards")
    .select("id, front, back")
    .eq("user_id", userId);

  for (const card of allCards ?? []) {
    await ingestDocument({
      sourceType: "card",
      sourceId: card.id,
      userId,
      title: card.front,
      text: `${card.front}\n${card.back}`,
      metadata: { visibility: "private" },
    });
  }

  await ingestDocument({
    sourceType: "insight",
    sourceId: userId,
    userId,
    title: "Weekly insight",
    text: insight,
    metadata: { visibility: "private" },
  });
}
