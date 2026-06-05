import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithFailover } from "@/lib/ai/router";
import { INSIGHT_SYSTEM } from "@/lib/ai/prompts";
import { searchContent, formatRagContext } from "@/lib/vectors/search";
import { ingestDocument } from "@/lib/vectors/ingest";
import { getDashboard } from "@/lib/dashboard/get-dashboard";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dashboard = await getDashboard(supabase, user.id);
    const weakTopics = [...dashboard.topics].sort((a, b) => a.mastery - b.mastery).slice(0, 3);
    const rag = await searchContent(
      `weak topics ${weakTopics.map((t) => t.name).join(" ")} due cards`,
      { userId: user.id }
    );

    const stats = `Due today: ${dashboard.topics.reduce((s, t) => s + t.due, 0)}. Topics: ${dashboard.topics.map((t) => `${t.name} ${t.mastery}% mastery ${t.due} due`).join("; ")}.`;
    const { text } = await generateWithFailover(
      `${stats}\n\nContext:\n${formatRagContext(rag)}\n\nWrite the insight.`,
      { system: INSIGHT_SYSTEM, route: "insight-regenerate", userId: user.id }
    );

    await supabase.from("user_insights").upsert({
      user_id: user.id,
      body: text.trim(),
      generated_at: new Date().toISOString(),
    });

    await ingestDocument({
      sourceType: "insight",
      sourceId: user.id,
      userId: user.id,
      title: "Weekly insight",
      text: text.trim(),
      metadata: { visibility: "private" },
    });

    const { createNotification } = await import("@/lib/notifications/create-notification");
    await createNotification(supabase, {
      userId: user.id,
      type: "ai",
      title: "Weekly insight updated",
      body: text.trim().slice(0, 120),
    });

    return NextResponse.json({ insight: text.trim() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI insight generation failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
