import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parsePaperListParams, queryPapers } from "@/lib/papers/query-papers";
import { PAPERS } from "@/lib/data/question-papers.fixtures";

function filterFixtures(
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
  return { papers: result.slice(start, start + limit), total, page, limit, source: "fixture" as const };
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
    return NextResponse.json(filterFixtures(params));
  }

  try {
    const supabase = await createClient();
    const result = await queryPapers(supabase, params);

    if (
      process.env.NODE_ENV === "development" &&
      result.total === 0 &&
      !hasActiveFilters(params)
    ) {
      return NextResponse.json(filterFixtures(params));
    }

    return NextResponse.json({ ...result, source: "db" });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(filterFixtures(params));
    }
    const message = e instanceof Error ? e.message : "Failed to load papers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
