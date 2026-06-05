import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithFailover } from "@/lib/ai/router";
import { CARD_GEN_SYSTEM } from "@/lib/ai/prompts";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const topic = (body.topic as string)?.trim();
  const description = (body.description as string)?.trim() ?? topic;

  if (!topic) {
    return NextResponse.json({ error: "Topic required" }, { status: 400 });
  }

  const { text } = await generateWithFailover(
    `Topic: ${topic}\nDescription: ${description}\n\nGenerate flashcards.`,
    { system: CARD_GEN_SYSTEM, json: true, route: "cards-generate", userId: user.id }
  );

  let cards: { front: string; back: string }[] = [];
  try {
    const parsed = JSON.parse(text);
    cards = Array.isArray(parsed) ? parsed : parsed.cards ?? [];
  } catch {
    return NextResponse.json({ error: "Failed to parse cards" }, { status: 500 });
  }

  return NextResponse.json({ cards });
}
