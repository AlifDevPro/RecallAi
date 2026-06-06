import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role === "admin";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const { data: submission, error } = await service
    .from("question_submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: questions } = await service
    .from("submitted_questions")
    .select("*")
    .eq("submission_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ submission, questions: questions ?? [] });
}
