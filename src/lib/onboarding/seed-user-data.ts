import type { SupabaseClient } from "@supabase/supabase-js";

/** @deprecated Demo seeding removed — new users start with an empty dashboard. */
export async function seedUserDashboardData(
  _supabase: SupabaseClient,
  _userId: string
) {
  // No-op: demo topics, cards, review history, and insights are no longer seeded.
}
