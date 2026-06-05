/**
 * Upsert fixture papers into Supabase `papers` table.
 * Run: npx tsx scripts/seed-papers-db.ts
 */
import { PAPERS } from "../src/lib/data/question-papers";
import { paperToDbRow } from "../src/lib/papers/map-paper";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  for (const paper of PAPERS) {
    const row = paperToDbRow(paper);
    const { error } = await supabase.from("papers").upsert(row);
    if (error) {
      console.error(`Failed ${paper.id}:`, error.message);
    } else {
      console.log(`Upserted ${paper.id}`);
    }
  }
  console.log("Done seeding papers.");
}

main().catch(console.error);
