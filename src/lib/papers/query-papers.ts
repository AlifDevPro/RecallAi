import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbPaper } from "./map-paper";
import type { Paper } from "@/lib/data/question-papers";

export type PaperListParams = {
  q?: string;
  university?: string[];
  department?: string[];
  course?: string[];
  semester?: string[];
  year?: string[];
  examType?: string[];
  verifiedOnly?: boolean;
  hasPhoto?: boolean;
  hasDigital?: boolean;
  page?: number;
  limit?: number;
};

export type PaperListResult = {
  papers: Paper[];
  total: number;
  page: number;
  limit: number;
};

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function parsePaperListParams(searchParams: URLSearchParams): PaperListParams {
  return {
    q: searchParams.get("q")?.trim() || undefined,
    university: parseList(searchParams.get("university")),
    department: parseList(searchParams.get("department")),
    course: parseList(searchParams.get("course")),
    semester: parseList(searchParams.get("semester")),
    year: parseList(searchParams.get("year")),
    examType: parseList(searchParams.get("examType")),
    verifiedOnly: searchParams.get("verifiedOnly") === "true",
    hasPhoto: searchParams.get("hasPhoto") === "true",
    hasDigital: searchParams.get("hasDigital") === "true",
    page: Math.max(1, Number(searchParams.get("page")) || 1),
    limit: Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 24)),
  };
}

export function paperListParamsToSearchParams(params: PaperListParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.university?.length) sp.set("university", params.university.join(","));
  if (params.department?.length) sp.set("department", params.department.join(","));
  if (params.course?.length) sp.set("course", params.course.join(","));
  if (params.semester?.length) sp.set("semester", params.semester.join(","));
  if (params.year?.length) sp.set("year", params.year.join(","));
  if (params.examType?.length) sp.set("examType", params.examType.join(","));
  if (params.verifiedOnly) sp.set("verifiedOnly", "true");
  if (params.hasPhoto) sp.set("hasPhoto", "true");
  if (params.hasDigital) sp.set("hasDigital", "true");
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.limit && params.limit !== 24) sp.set("limit", String(params.limit));
  return sp;
}

function sanitizeSearchQuery(value: string): string | undefined {
  const cleaned = value.replace(/[,().]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function applyFilters<T extends { eq: Function; in: Function; ilike: Function; or: Function }>(
  query: T,
  params: PaperListParams
): T {
  let q = query as T;

  if (params.university?.length) {
    q = q.in("university", params.university) as T;
  }
  if (params.department?.length) {
    q = q.in("department", params.department) as T;
  }
  if (params.course?.length) {
    q = q.in("course", params.course) as T;
  }
  if (params.semester?.length) {
    q = q.in("semester", params.semester) as T;
  }
  if (params.year?.length) {
    const years = params.year.map(Number).filter((y) => !Number.isNaN(y));
    if (years.length) q = q.in("year", years) as T;
  }
  if (params.examType?.length) {
    q = q.in("exam_type", params.examType) as T;
  }
  if (params.verifiedOnly) {
    q = q.eq("verified", true) as T;
  }
  if (params.hasPhoto) {
    q = q.eq("has_photo", true) as T;
  }
  if (params.hasDigital) {
    q = q.eq("has_digital", true) as T;
  }
  const searchQ = params.q ? sanitizeSearchQuery(params.q) : undefined;
  if (searchQ) {
    const needle = `%${searchQ}%`;
    q = q.or(
      `course.ilike.${needle},course_title.ilike.${needle},university.ilike.${needle},department.ilike.${needle}`
    ) as T;
  }

  return q;
}

export async function queryPapers(
  supabase: SupabaseClient,
  params: PaperListParams
): Promise<PaperListResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 24;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let countQuery = supabase
    .from("papers")
    .select("*", { count: "exact", head: true })
    .eq("visibility", "public");

  countQuery = applyFilters(countQuery, params);
  const { count, error: countError } = await countQuery;

  if (countError) {
    throw new Error(countError.message);
  }

  let dataQuery = supabase
    .from("papers")
    .select("*")
    .eq("visibility", "public")
    .order("year", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  dataQuery = applyFilters(dataQuery, params);
  const { data, error } = await dataQuery;

  if (error) {
    throw new Error(error.message);
  }

  return {
    papers: (data ?? []).map(mapDbPaper),
    total: count ?? 0,
    page,
    limit,
  };
}

export type PaperFacets = {
  universities: string[];
  departments: string[];
  courses: string[];
  years: number[];
  examTypes: string[];
  semesters: string[];
  departmentsByUniversity: Record<string, string[]>;
};

export async function queryPaperFacets(supabase: SupabaseClient): Promise<PaperFacets> {
  const { data, error } = await supabase
    .from("papers")
    .select("university, department, course, year, exam_type, semester")
    .eq("visibility", "public");

  if (error) {
    throw new Error(error.message);
  }

  const universities = new Set<string>();
  const departments = new Set<string>();
  const courses = new Set<string>();
  const years = new Set<number>();
  const examTypes = new Set<string>();
  const semesters = new Set<string>();
  const departmentsByUniversity: Record<string, Set<string>> = {};

  for (const row of data ?? []) {
    if (row.university) {
      universities.add(row.university);
      if (row.department) {
        if (!departmentsByUniversity[row.university]) {
          departmentsByUniversity[row.university] = new Set();
        }
        departmentsByUniversity[row.university].add(row.department);
      }
    }
    if (row.department) departments.add(row.department);
    if (row.course) courses.add(row.course);
    if (row.year) years.add(row.year);
    if (row.exam_type) examTypes.add(row.exam_type);
    if (row.semester) semesters.add(String(row.semester));
  }

  return {
    universities: Array.from(universities).sort(),
    departments: Array.from(departments).sort(),
    courses: Array.from(courses).sort(),
    years: Array.from(years).sort((a, b) => b - a),
    examTypes: Array.from(examTypes).sort(),
    semesters: Array.from(semesters).sort((a, b) => Number(a) - Number(b)),
    departmentsByUniversity: Object.fromEntries(
      Object.entries(departmentsByUniversity).map(([u, set]) => [u, Array.from(set).sort()])
    ),
  };
}

export async function queryRelatedPapers(
  supabase: SupabaseClient,
  paperId: string,
  limit = 4
): Promise<Paper[]> {
  const { data: current } = await supabase
    .from("papers")
    .select("course, university")
    .eq("id", paperId)
    .single();

  if (!current) return [];

  const { data } = await supabase
    .from("papers")
    .select("*")
    .eq("visibility", "public")
    .eq("course", current.course)
    .eq("university", current.university)
    .neq("id", paperId)
    .order("year", { ascending: false })
    .limit(limit);

  return (data ?? []).map(mapDbPaper);
}
