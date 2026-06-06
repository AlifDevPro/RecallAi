/**
 * Backfill public question papers into pgvector.
 * Run: npx tsx scripts/embed-public-papers.ts
 */
import { createClient } from "@supabase/supabase-js";
import { mapDbPaper } from "../src/lib/papers/map-paper";
import { ingestDocument } from "../src/lib/vectors/ingest";
import { PAPERS } from "../src/lib/data/question-papers.fixtures";

async function embedPaper(paper: ReturnType<typeof mapDbPaper>) {
  const digitalText = paper.digital.sections.flatMap((s) => s.questions.map((q) => q.q)).join("\n");
  const scanText = paper.scans.map((_, i) => `Page ${i + 1}`).join("\n");
  const text = `${paper.courseTitle} ${paper.university} ${paper.department} ${paper.year}\n${digitalText}\n${scanText}`;

  await ingestDocument({
    sourceType: "paper",
    sourceId: paper.id,
    userId: null,
    title: `${paper.courseTitle} — ${paper.year}`,
    text,
    metadata: {
      visibility: "public",
      university: paper.university,
      examType: paper.examType,
    },
  });

  for (const [si, section] of paper.digital.sections.entries()) {
    for (const [qi, q] of section.questions.entries()) {
      await ingestDocument({
        sourceType: "question",
        sourceId: `${paper.id}-s${si}-q${qi}`,
        userId: null,
        title: q.q.slice(0, 80),
        text: q.q,
        metadata: { visibility: "public", paperId: paper.id },
      });
    }
  }
  console.log(`Embedded paper ${paper.id}`);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    const supabase = createClient(url, key);
    const { data: rows } = await supabase.from("papers").select("*").eq("visibility", "public");
    if (rows?.length) {
      for (const row of rows) {
        await embedPaper(mapDbPaper(row));
      }
      console.log("Done embedding from database.");
      return;
    }
  }

  for (const paper of PAPERS) {
    await embedPaper(paper);
  }
  console.log("Done embedding from fixtures.");
}

main().catch(console.error);
