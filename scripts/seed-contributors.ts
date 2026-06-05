/**
 * Seed contributor stats from fixtures (requires existing profile UUIDs in DB).
 * Run after users exist: npx tsx scripts/seed-contributors.ts
 */
import { CONTRIBUTORS } from "../src/lib/data/contributors";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data: profiles } = await supabase.from("profiles").select("id").limit(CONTRIBUTORS.length);

  if (!profiles?.length) {
    console.log("No profiles in DB — skip contributor seed until users sign up.");
    return;
  }

  for (let i = 0; i < Math.min(profiles.length, CONTRIBUTORS.length); i++) {
    const c = CONTRIBUTORS[i];
    const id = profiles[i].id;
    await supabase.from("contributors").upsert({
      id,
      contributions: c.contributions,
      accuracy: c.accuracy,
      verified: c.verified,
      institution: c.inst,
      tier: c.tier,
    });
    console.log(`Upserted contributor ${c.name}`);
  }
  console.log("Done.");
}

main().catch(console.error);
