import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestDocument } from "@/lib/vectors/ingest";
import { validateCardFields } from "@/lib/topics/validate-topic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; cardId: string }> }
) {
  const { cardId, slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, string> = {};
  if (typeof body.front === "string") updates.front = body.front.trim();
  if (typeof body.back === "string") updates.back = body.back.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("cards")
    .select("front, back")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const front = updates.front ?? existing.front;
  const back = updates.back ?? existing.back;
  const cardError = validateCardFields(front, back);
  if (cardError) {
    return NextResponse.json({ error: cardError }, { status: 400 });
  }

  const { error } = await supabase
    .from("cards")
    .update(updates)
    .eq("id", cardId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await ingestDocument({
    sourceType: "card",
    sourceId: cardId,
    userId: user.id,
    title: front,
    text: `${front}\n${back}`,
    metadata: { visibility: "private", topicSlug: slug },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; cardId: string }> }
) {
  const { cardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("cards").delete().eq("id", cardId).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
