import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type TopicInsightsPayload = {
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  actions: string[];
  cached?: boolean;
};

function parseInsights(raw: unknown): TopicInsightsPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    summary: typeof o.summary === "string" ? o.summary : null,
    strengths: Array.isArray(o.strengths) ? o.strengths.filter((s): s is string => typeof s === "string") : [],
    weaknesses: Array.isArray(o.weaknesses) ? o.weaknesses.filter((s): s is string => typeof s === "string") : [],
    actions: Array.isArray(o.actions) ? o.actions.filter((s): s is string => typeof s === "string") : [],
    cached: true,
  };
}

/** Returns cached topic insights from DB when available. */
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
    .select("id, name, insights")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .single();

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const cached = parseInsights(topic.insights);
  if (cached?.summary) {
    return NextResponse.json(cached);
  }

  return NextResponse.json({
    summary: null,
    strengths: [],
    weaknesses: [],
    actions: [],
    cached: false,
  } satisfies TopicInsightsPayload);
}
