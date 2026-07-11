import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parsePaperListParams, queryPapers } from "@/lib/papers/query-papers";
import { resolvePaperScanUrls } from "@/lib/papers/scan-urls";
import { PAPERS } from "@/lib/data/question-papers.fixtures";
import type { Paper } from "@/lib/data/question-papers";

async function withCoverUrls(papers: Paper[]) {
  try {
    const service = createServiceClient();
    return Promise.all(
      papers.map(async (paper) => {
        const resolved = await resolvePaperScanUrls(service, paper);
        return {
          ...resolved,
          coverUrl: resolved.scans[0]?.pageUrl ?? null,
        };
      })
    );
  } catch {
    const { scanProxyUrl, normalizeStoragePath } = await import("@/lib/papers/scan-urls");
    return papers.map((paper) => {
      const raw = paper.scans[0]?.pageUrl;
      const coverUrl =
        raw && !raw.startsWith("http")
          ? scanProxyUrl(normalizeStoragePath(raw))
          : raw?.startsWith("http")
            ? raw
            : null;
      return { ...paper, coverUrl };
    });
  }
}

async function filterFixtures(
  params: ReturnType<typeof parsePaperListParams>
) {
  let result = PAPERS;
  if (params.university?.length) {
    result = result.filter((p) => params.university!.includes(p.university));
  }
  if (params.department?.length) {
    result = result.filter((p) => params.department!.includes(p.department));
  }
  if (params.course?.length) {
    result = result.filter((p) => params.course!.includes(p.course));
  }
  if (params.semester?.length) {
    result = result.filter((p) => params.semester!.includes(String(p.semester)));
  }
  if (params.year?.length) {
    result = result.filter((p) => params.year!.includes(String(p.year)));
  }
  if (params.examType?.length) {
    result = result.filter((p) => params.examType!.includes(p.examType));
  }
  if (params.verifiedOnly) result = result.filter((p) => p.verified);
  if (params.hasPhoto) result = result.filter((p) => p.hasPhoto);
  if (params.hasDigital) result = result.filter((p) => p.hasDigital);
  if (params.q) {
    const needle = params.q.toLowerCase();
    result = result.filter((p) =>
      `${p.course} ${p.courseTitle} ${p.university} ${p.department}`.toLowerCase().includes(needle)
    );
  }
  const page = params.page ?? 1;
  const limit = params.limit ?? 24;
  const total = result.length;
  const start = (page - 1) * limit;
  const slice = result.slice(start, start + limit);
  const papers = await withCoverUrls(slice);
  return { papers, total, page, limit, source: "fixture" as const };
}

function hasActiveFilters(params: ReturnType<typeof parsePaperListParams>): boolean {
  return Boolean(
    params.q ||
      params.university?.length ||
      params.department?.length ||
      params.course?.length ||
      params.semester?.length ||
      params.year?.length ||
      params.examType?.length ||
      params.verifiedOnly ||
      params.hasPhoto ||
      params.hasDigital ||
      (params.page && params.page > 1)
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = parsePaperListParams(searchParams);
  const useFixture =
    process.env.NODE_ENV === "development" && searchParams.get("source") === "fixture";

  if (useFixture) {
    return NextResponse.json(await filterFixtures(params));
  }

  try {
    const supabase = await createClient();
    const result = await queryPapers(supabase, params);

    if (
      process.env.NODE_ENV === "development" &&
      result.total === 0 &&
      !hasActiveFilters(params)
    ) {
      return NextResponse.json(await filterFixtures(params));
    }

    const papers = await withCoverUrls(result.papers);
    return NextResponse.json({ ...result, papers, source: "db" });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(await filterFixtures(params));
    }
    const message = e instanceof Error ? e.message : "Failed to load papers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
