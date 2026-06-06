import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryRelatedPapers } from "@/lib/papers/query-papers";
import { PAPERS } from "@/lib/data/question-papers.fixtures";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const papers = await queryRelatedPapers(supabase, id);
    if (papers.length > 0) {
      return NextResponse.json({ papers });
    }
  } catch {
    /* fall through */
  }

  const current = PAPERS.find((p) => p.id === id);
  if (current && process.env.NODE_ENV === "development") {
    const related = PAPERS.filter((p) => p.id !== id && p.course === current.course).slice(0, 4);
    return NextResponse.json({ papers: related });
  }

  return NextResponse.json({ papers: [] });
}
