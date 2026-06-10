import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/route-auth";
import { generateWithFailover } from "@/lib/ai/router";
import { isGroqConfigured } from "@/lib/ai/config";
import { searchContent, formatRagContext } from "@/lib/vectors/search";
import { normalizeRoadmapFromAi } from "@/lib/topics/validate-topic";

const ROADMAP_SYSTEM = `Create a learning roadmap as JSON array of milestones:
[{ "id": string, "title": string, "description": string, "status": "done"|"active"|"upcoming", "progress": number, "eta": string, "tasks": [{ "id": string, "label": string, "done": boolean }] }]
Use 3-5 milestones. Include 2-4 tasks per milestone.`;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  if (!isGroqConfigured()) {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }

  const { data: topic } = await supabase
    .from("topics")
    .select("id, name, roadmap")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .single();

  if (!topic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const rag = await searchContent(topic.name, { userId: user.id, includePublic: true });
    const { text } = await generateWithFailover(
      `Create a learning roadmap for topic "${topic.name}".\n\nContext:\n${formatRagContext(rag)}`,
      { system: ROADMAP_SYSTEM, json: true, route: "topic-roadmap", userId: user.id }
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Failed to parse roadmap" }, { status: 500 });
    }

    const roadmap = normalizeRoadmapFromAi(parsed);
    if (!roadmap.length) {
      return NextResponse.json({ error: "AI returned an empty roadmap" }, { status: 422 });
    }

    const { error: updateError } = await supabase
      .from("topics")
      .update({ roadmap })
      .eq("id", topic.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ roadmap });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Roadmap generation failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
