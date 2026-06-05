import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithFailover } from "@/lib/ai/router";
import { isGroqConfigured } from "@/lib/ai/config";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { searchContent, formatRagContext } from "@/lib/vectors/search";

const INSIGHTS_SYSTEM = `Return JSON: { "summary": string, "strengths": string[], "weaknesses": string[], "actions": string[] }
Write 2-3 sentence summary, up to 3 strengths/weaknesses, and 3 actionable next steps grounded in the student's cards.`;

export async function POST(
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

  if (!isGroqConfigured()) {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }

  const rate = await checkRateLimit(user.id);
  if (!rate.ok) {
    return NextResponse.json({ error: "Daily AI limit reached" }, { status: 429 });
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

  try {
    const rag = await searchContent(topic.name, { userId: user.id, includePublic: true });
    const { text } = await generateWithFailover(
      `Topic: ${topic.name}\n\nContext:\n${formatRagContext(rag)}`,
      { system: INSIGHTS_SYSTEM, json: true, route: "topic-insights", userId: user.id }
    );

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({
        summary: text,
        strengths: [],
        weaknesses: [],
        actions: [],
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Insights generation failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
