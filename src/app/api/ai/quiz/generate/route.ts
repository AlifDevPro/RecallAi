import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithFailover } from "@/lib/ai/router";
import { isGroqConfigured } from "@/lib/ai/config";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { QUIZ_GEN_SYSTEM } from "@/lib/ai/prompts";
import { searchContent, formatRagContext } from "@/lib/vectors/search";
import { validateQuizQuestions } from "@/lib/quiz/validate-questions";

export async function POST(request: Request) {
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

  const body = await request.json();
  const topicSlug = (body.topicSlug as string)?.trim();
  const count = Math.min(20, Math.max(5, Number(body.count) || 10));

  if (!topicSlug) {
    return NextResponse.json({ error: "topicSlug required" }, { status: 400 });
  }

  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select("id, name, slug, status")
    .eq("user_id", user.id)
    .eq("slug", topicSlug)
    .single();

  if (topicError || !topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (topic.status === "archived") {
    return NextResponse.json({ error: "Topic is archived" }, { status: 400 });
  }

  const { data: cards } = await supabase
    .from("cards")
    .select("front, back")
    .eq("topic_id", topic.id)
    .eq("user_id", user.id)
    .limit(30);

  const cardContext = (cards ?? [])
    .map((c) => `Q: ${c.front}\nA: ${c.back}`)
    .join("\n\n");

  if (!cardContext.trim()) {
    return NextResponse.json(
      { error: "Add flashcards to this topic before generating a quiz" },
      { status: 400 }
    );
  }

  try {
    const rag = await searchContent(topic.name, { userId: user.id, includePublic: true });
    const { text } = await generateWithFailover(
      `Topic: ${topic.name}\nGenerate exactly ${count} multiple-choice questions.\n\nFlashcards:\n${cardContext}\n\nAdditional context:\n${formatRagContext(rag)}`,
      { system: QUIZ_GEN_SYSTEM, json: true, route: "quiz-generate", userId: user.id }
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Failed to parse quiz" }, { status: 500 });
    }

    const questions = validateQuizQuestions(parsed, count);

    return NextResponse.json({
      questions,
      topic: { slug: topic.slug, name: topic.name },
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Quiz generation failed";
    const status = message.includes("valid questions") ? 422 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
