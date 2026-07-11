import type { SupabaseClient } from "@supabase/supabase-js";
import { MINUTES_PER_CARD } from "@/lib/review/constants";
import { minutesToHours } from "@/lib/schedule/preferences-schema";

/** How many brand-new cards to introduce per study day. */
export function newCardsPerDay(minutesPerDay: number): number {
  const budget = Math.max(10, minutesPerDay);
  return Math.min(20, Math.max(3, Math.floor(budget / (MINUTES_PER_CARD * 2))));
}

/**
 * Stagger `due_at` for newly created cards so the queue is not flooded.
 * First batch is due immediately; later cards spread across upcoming days.
 */
export function staggerNewCardDueDates(
  count: number,
  options: { newPerDay?: number; start?: Date } = {}
): string[] {
  if (count <= 0) return [];
  const newPerDay = Math.max(1, options.newPerDay ?? 5);
  const start = options.start ?? new Date();
  const startMs = start.getTime();

  return Array.from({ length: count }, (_, index) => {
    const dayOffset = Math.floor(index / newPerDay);
    const slotMs = (index % newPerDay) * 15 * 60_000;
    return new Date(startMs + dayOffset * 86400_000 + slotMs).toISOString();
  });
}

export async function getNewCardsBudget(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data: plan } = await supabase
    .from("study_plans")
    .select("minutes_per_day, hours_per_day")
    .eq("user_id", userId)
    .single();

  const minutes =
    plan?.minutes_per_day ??
    (plan?.hours_per_day != null ? minutesToHours(Number(plan.hours_per_day)) * 60 : 30);

  return newCardsPerDay(Number(minutes) || 30);
}

export function buildSchedulingInsert(
  cardId: string,
  userId: string,
  dueAt: string
) {
  return {
    card_id: cardId,
    user_id: userId,
    due_at: dueAt,
    mastery: 0,
    easiness: 2.5,
    interval_days: 0,
    repetitions: 0,
    lapse_count: 0,
  };
}

export async function dueAtForNewCard(
  supabase: SupabaseClient,
  userId: string,
  extraOffset = 0
): Promise<string> {
  let count = 0;
  const { count: repCount, error } = await supabase
    .from("card_scheduling")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("repetitions", 0);

  if (error?.message?.includes("repetitions")) {
    const fallback = await supabase
      .from("card_scheduling")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("mastery", 0);
    count = fallback.count ?? 0;
  } else {
    count = repCount ?? 0;
  }

  const index = count + extraOffset;
  const newPerDay = await getNewCardsBudget(supabase, userId);
  const dates = staggerNewCardDueDates(index + 1, { newPerDay });
  return dates[index] ?? new Date().toISOString();
}

export async function insertCardScheduling(
  supabase: SupabaseClient,
  row: ReturnType<typeof buildSchedulingInsert>
) {
  const { error } = await supabase.from("card_scheduling").insert(row);
  if (error?.message?.includes("easiness") || error?.message?.includes("repetitions")) {
    const { error: legacyError } = await supabase.from("card_scheduling").insert({
      card_id: row.card_id,
      user_id: row.user_id,
      due_at: row.due_at,
      mastery: row.mastery,
    });
    if (legacyError) throw new Error(legacyError.message);
  } else if (error) {
    throw new Error(error.message);
  }
}
