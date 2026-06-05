/**
 * Backfill public question papers into pgvector.
 * Run: npx tsx scripts/embed-public-papers.ts
 * Requires SUPABASE_SERVICE_ROLE_KEY and GOOGLE_GENERATIVE_AI_API_KEY in env.
 */
import { PAPERS } from "../src/lib/data/question-papers";
import { ingestDocument } from "../src/lib/vectors/ingest";

async function main() {
  for (const paper of PAPERS) {
    const digitalText = paper.digital.sections
      .flatMap((s) => s.questions.map((q) => q.q))
      .join("\n");
    const scanText = paper.scans.map((s, i) => `Page ${i + 1}`).join("\n");
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
  console.log("Done.");
}

main().catch(console.error);
