import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Returns empty insights shell — use POST .../insights/regenerate to generate with AI. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: topic } = await supabase
    .from("topics")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .single();

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  return NextResponse.json({
    summary: null,
    strengths: [],
    weaknesses: [],
    actions: [],
    cached: false,
  });
}
