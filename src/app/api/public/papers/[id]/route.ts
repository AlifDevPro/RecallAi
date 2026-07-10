import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { mapDbPaper } from "@/lib/papers/map-paper";
import { resolvePaperScanUrls } from "@/lib/papers/scan-urls";
import { getPaper } from "@/lib/data/question-papers.fixtures";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: paper } = await supabase.from("papers").select("*").eq("id", id).single();

  if (paper) {
    let mapped = mapDbPaper(paper);
    try {
      const service = createServiceClient();
      mapped = await resolvePaperScanUrls(service, mapped);
      await service.rpc("increment_paper_views", { paper_id: id });
    } catch {
      /* views/signing optional if service key missing locally */
    }
    return NextResponse.json({ paper: mapped, source: "db" });
  }

  if (process.env.NODE_ENV === "development") {
    const fixture = getPaper(id);
    if (fixture) {
      try {
        const service = createServiceClient();
        const resolved = await resolvePaperScanUrls(service, fixture);
        return NextResponse.json({ paper: resolved, source: "fixture" });
      } catch {
        return NextResponse.json({ paper: fixture, source: "fixture" });
      }
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
