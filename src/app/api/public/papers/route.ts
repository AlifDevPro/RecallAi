import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PAPERS } from "@/lib/data/question-papers";
import { mapDbPaper } from "@/lib/papers/map-paper";

function filterPapers<T extends { university?: string; topic?: string; year?: number; title?: string }>(
  papers: T[],
  params: { university?: string | null; topic?: string | null; year?: string | null; q?: string | null }
): T[] {
  let result = papers;
  if (params.university) {
    result = result.filter((p) => p.university?.toLowerCase().includes(params.university!.toLowerCase()));
  }
  if (params.topic) {
    result = result.filter((p) => p.topic?.toLowerCase().includes(params.topic!.toLowerCase()));
  }
  if (params.year) {
    const y = Number(params.year);
    if (!Number.isNaN(y)) result = result.filter((p) => p.year === y);
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    result = result.filter(
      (p) => p.title?.toLowerCase().includes(q) || p.topic?.toLowerCase().includes(q) || p.university?.toLowerCase().includes(q)
    );
  }
  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const university = searchParams.get("university");
  const topic = searchParams.get("topic");
  const year = searchParams.get("year");
  const q = searchParams.get("q");
  const strict = searchParams.get("source") === "db";

  const supabase = await createClient();

  let query = supabase
    .from("papers")
    .select("*")
    .eq("visibility", "public")
    .order("year", { ascending: false });

  if (university) query = query.ilike("institution", `%${university}%`);
  if (topic) query = query.ilike("topic", `%${topic}%`);
  if (year) query = query.eq("year", Number(year));

  const { data: dbPapers, error } = await query;

  if (!error && dbPapers && dbPapers.length > 0) {
    let papers = dbPapers.map(mapDbPaper);
    if (q) papers = filterPapers(papers, { q });
    return NextResponse.json({ papers, source: "db" });
  }

  if (strict) {
    return NextResponse.json({ papers: [], source: "db" });
  }

  const papers = filterPapers(PAPERS, { university, topic, year, q });
  return NextResponse.json({ papers, source: "fixture" });
}
