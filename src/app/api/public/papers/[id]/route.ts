import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaper } from "@/lib/data/question-papers";
import { mapDbPaper } from "@/lib/papers/map-paper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: paper } = await supabase
    .from("papers")
    .select("*")
    .eq("id", id)
    .single();

  if (paper) {
    return NextResponse.json({ paper: mapDbPaper(paper) });
  }

  const fixture = getPaper(id);
  if (!fixture) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ paper: fixture });
}
