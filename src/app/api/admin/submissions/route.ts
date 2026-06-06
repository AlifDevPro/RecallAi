import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { promoteSubmission } from "@/lib/papers/promote-submission";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role === "admin";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: submissions } = await service
    .from("question_submissions")
    .select("id, status, institution, course, semester, year, term, topic, created_at, user_id, file_paths")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = await Promise.all(
    (submissions ?? []).map(async (s) => {
      const { count } = await service
        .from("submitted_questions")
        .select("*", { count: "exact", head: true })
        .eq("submission_id", s.id);
      return {
        id: s.id,
        status: s.status,
        institution: s.institution,
        course: s.course,
        semester: s.semester,
        year: s.year,
        term: s.term,
        topic: s.topic,
        created_at: s.created_at,
        user_id: s.user_id,
        file_paths: s.file_paths,
        questionCount: count ?? 0,
      };
    })
  );

  return NextResponse.json({ submissions: rows });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = body.id as string;
  const status = body.status as string;

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  const service = createServiceClient();

  if (status === "approved") {
    try {
      const { paperId } = await promoteSubmission(service, id);
      return NextResponse.json({ ok: true, paperId });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Promotion failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  await service.from("question_submissions").update({ status }).eq("id", id);
  return NextResponse.json({ ok: true });
}
