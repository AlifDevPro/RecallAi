import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { streamWithFailover } from "@/lib/ai/router";
import { TUTOR_SYSTEM } from "@/lib/ai/prompts";
import { searchContent, formatRagContext, extractCitations } from "@/lib/vectors/search";
import { ingestDocument } from "@/lib/vectors/ingest";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await checkRateLimit(user.id);
  if (!rate.ok) {
    return NextResponse.json({ error: "Daily AI limit reached" }, { status: 429 });
  }

  const body = await request.json();
  const message = (body.message as string)?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  let threadId = body.threadId as string | undefined;
  if (!threadId) {
    const { data: thread } = await supabase
      .from("tutor_threads")
      .insert({
        user_id: user.id,
        topic_slug: body.topicSlug ?? null,
        title: message.slice(0, 60),
      })
      .select("id")
      .single();
    threadId = thread?.id;
  }

  if (!threadId) {
    return NextResponse.json({ error: "Could not create thread" }, { status: 500 });
  }

  await supabase.from("tutor_messages").insert({
    thread_id: threadId,
    role: "user",
    content: message,
  });

  const matches = await searchContent(message, {
    userId: user.id,
    includePublic: true,
  });
  const context = formatRagContext(matches);
  const citations = extractCitations(matches);

  const prompt = `Context chunks:\n${context}\n\nStudent question: ${message}`;

  const { stream, finalize } = await streamWithFailover(prompt, {
    system: TUTOR_SYSTEM,
    route: "tutor-chat",
    userId: user.id,
  });

  const encoder = new TextEncoder();
  let fullText = "";

  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "meta", threadId, citations })}\n\n`)
      );
      try {
        for await (const chunk of stream) {
          fullText += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "token", text: chunk })}\n\n`)
          );
        }
        await finalize();

        await supabase.from("tutor_messages").insert({
          thread_id: threadId,
          role: "assistant",
          content: fullText,
          citations,
        });

        await ingestDocument({
          sourceType: "chat_turn",
          sourceId: `${threadId}-${Date.now()}`,
          userId: user.id,
          title: "Tutor exchange",
          text: `Q: ${message}\nA: ${fullText}`,
          metadata: { visibility: "private", threadId },
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } catch (e) {
        const err = e instanceof Error ? e.message : "Stream failed";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: err })}\n\n`)
        );
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
