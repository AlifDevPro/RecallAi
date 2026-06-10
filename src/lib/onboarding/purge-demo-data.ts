import type { SupabaseClient } from "@supabase/supabase-js";

const DEMO_CARD_PATTERN = / card \d+$/i;
const DEMO_TOPIC_SLUGS = new Set([
  "algorithms",
  "database-systems",
  "python",
  "organic-chemistry",
  "system-design",
]);

export type PurgeDemoResult = {
  purged: boolean;
  reason: string;
};

function isDemoCardFront(front: string): boolean {
  return DEMO_CARD_PATTERN.test(front.trim());
}

async function findDemoContent(supabase: SupabaseClient, userId: string) {
  const { data: topics } = await supabase
    .from("topics")
    .select("id, slug")
    .eq("user_id", userId);

  const demoTopicIds =
    topics?.filter((t) => DEMO_TOPIC_SLUGS.has(t.slug)).map((t) => t.id) ?? [];

  const { data: cards } = await supabase
    .from("cards")
    .select("id, front, topic_id")
    .eq("user_id", userId);

  const demoCardIds = new Set<string>();
  for (const card of cards ?? []) {
    if (isDemoCardFront(card.front) || demoTopicIds.includes(card.topic_id)) {
      demoCardIds.add(card.id);
    }
  }

  return {
    hasDemo: demoTopicIds.length > 0 || demoCardIds.size > 0,
    demoTopicIds,
    demoCardIds: [...demoCardIds],
  };
}

export async function hasPreAccountReviewEvents(
  supabase: SupabaseClient,
  userId: string,
  accountCreatedAt: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("review_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lt("reviewed_at", accountCreatedAt);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function shouldPurgeDemoData(
  supabase: SupabaseClient,
  userId: string,
  accountCreatedAt: string
): Promise<{ shouldPurge: boolean; reason: string }> {
  const demo = await findDemoContent(supabase, userId);
  if (demo.hasDemo) {
    return { shouldPurge: true, reason: "demo topics or cards detected" };
  }

  const preAccount = await hasPreAccountReviewEvents(supabase, userId, accountCreatedAt);
  if (preAccount) {
    return { shouldPurge: true, reason: "review events before account creation" };
  }

  return { shouldPurge: false, reason: "no demo data" };
}

export async function purgeDemoData(
  supabase: SupabaseClient,
  userId: string,
  accountCreatedAt: string
): Promise<PurgeDemoResult> {
  const demo = await findDemoContent(supabase, userId);
  const preAccount = await hasPreAccountReviewEvents(supabase, userId, accountCreatedAt);

  if (!demo.hasDemo && !preAccount) {
    return { purged: false, reason: "no demo data" };
  }

  const reasons: string[] = [];

  if (demo.demoCardIds.length > 0) {
    const { error: schedError } = await supabase
      .from("card_scheduling")
      .delete()
      .eq("user_id", userId)
      .in("card_id", demo.demoCardIds);
    if (schedError) throw new Error(schedError.message);

    const { error: cardsError } = await supabase
      .from("cards")
      .delete()
      .eq("user_id", userId)
      .in("id", demo.demoCardIds);
    if (cardsError) throw new Error(cardsError.message);
    reasons.push(`${demo.demoCardIds.length} demo cards`);
  }

  if (demo.demoTopicIds.length > 0) {
    const { error: topicsError } = await supabase
      .from("topics")
      .delete()
      .eq("user_id", userId)
      .in("id", demo.demoTopicIds);
    if (topicsError) throw new Error(topicsError.message);
    reasons.push(`${demo.demoTopicIds.length} demo topics`);
  }

  if (demo.hasDemo) {
    const { error: reviewsError } = await supabase
      .from("review_events")
      .delete()
      .eq("user_id", userId);
    if (reviewsError) throw new Error(reviewsError.message);
    reasons.push("synthetic review history");

    const { error: insightError } = await supabase
      .from("user_insights")
      .delete()
      .eq("user_id", userId);
    if (insightError) throw new Error(insightError.message);
    reasons.push("demo insights");
  } else if (preAccount) {
    const { error: reviewsError } = await supabase
      .from("review_events")
      .delete()
      .eq("user_id", userId)
      .lt("reviewed_at", accountCreatedAt);
    if (reviewsError) throw new Error(reviewsError.message);
    reasons.push("pre-account review events");
  }

  return { purged: true, reason: reasons.join(", ") };
}

export async function ensureDemoDataPurged(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("created_at, settings")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return;

  const settings = (profile.settings ?? {}) as Record<string, unknown>;
  if (settings.demoPurged === true) return;

  const accountCreatedAt = profile.created_at;
  const { shouldPurge } = await shouldPurgeDemoData(supabase, userId, accountCreatedAt);

  if (shouldPurge) {
    await purgeDemoData(supabase, userId, accountCreatedAt);
  }

  await supabase
    .from("profiles")
    .update({
      settings: { ...settings, demoPurged: true },
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}
