/**
 * Remove onboarding demo data for a user account.
 *
 * Run: npx tsx scripts/clear-demo-user-data.ts <email-or-user-id>
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  purgeDemoData,
  shouldPurgeDemoData,
} from "../src/lib/onboarding/purge-demo-data";

async function resolveUserId(
  supabase: SupabaseClient,
  identifier: string
): Promise<{ id: string; created_at: string } | null> {
  if (/^[0-9a-f-]{36}$/i.test(identifier)) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, created_at")
      .eq("id", identifier)
      .maybeSingle<{ id: string; created_at: string }>();
    if (error) {
      console.error("Profile lookup failed:", error.message);
      return null;
    }
    return data;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, created_at")
    .eq("email", identifier)
    .maybeSingle<{ id: string; created_at: string }>();

  if (error) {
    console.error("Profile lookup failed:", error.message);
    return null;
  }

  return data;
}

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error("Usage: npx tsx scripts/clear-demo-user-data.ts <email-or-user-id>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const profile = await resolveUserId(supabase, identifier);
  if (!profile) {
    console.error("User not found:", identifier);
    process.exit(1);
  }

  const check = await shouldPurgeDemoData(supabase, profile.id, profile.created_at);
  if (!check.shouldPurge) {
    console.log("No demo data detected for user", profile.id);
    process.exit(0);
  }

  const result = await purgeDemoData(supabase, profile.id, profile.created_at);
  console.log(result.purged ? `Purged: ${result.reason}` : result.reason);
  console.log("Done. User", profile.id, "now has real-only activity data.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
