import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const topic = searchParams.get("topic");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("mock_attempts")
    .select("id, title, topics, duration_min, status, score, max_score, started_at, submitted_at, config")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(50);

  if (from) query = query.gte("started_at", from);
  if (to) query = query.lte("started_at", to);

  const { data: attempts } = await query;

  let filtered = attempts ?? [];

  if (topic) {
    filtered = filtered.filter((a) =>
      (a.topics as string[] | null)?.some((t) =>
        t.toLowerCase().includes(topic.toLowerCase())
      )
    );
  }

  if (mode === "global" || mode === "institutional") {
    filtered = filtered.filter((a) => {
      const cfg = (a.config ?? {}) as { mode?: string };
      return cfg.mode === mode;
    });
  }

  return NextResponse.json({ attempts: filtered });
}
