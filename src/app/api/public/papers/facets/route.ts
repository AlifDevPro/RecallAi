import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryPaperFacets } from "@/lib/papers/query-papers";
import {
  ALL_DEPARTMENTS,
  DEPARTMENTS,
  EXAM_TYPES,
  UNIVERSITIES,
} from "@/lib/data/question-papers.fixtures";

export async function GET() {
  try {
    const supabase = await createClient();
    const facets = await queryPaperFacets(supabase);
    if (facets.universities.length > 0) {
      return NextResponse.json(facets);
    }
  } catch {
    /* fall through to fixtures in dev */
  }

  const years = Array.from({ length: 8 }, (_, i) => 2018 + i).reverse();
  return NextResponse.json({
    universities: UNIVERSITIES,
    departments: ALL_DEPARTMENTS,
    courses: ["CSE 213", "CSE 305", "CSE 351", "CSE 421", "CSE 471", "ECE 311", "ME 241", "EE 205"],
    years,
    examTypes: EXAM_TYPES,
    semesters: Array.from({ length: 8 }, (_, i) => String(i + 1)),
    departmentsByUniversity: DEPARTMENTS,
  });
}
