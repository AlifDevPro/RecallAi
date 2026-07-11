import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { requireUser } from "@/lib/supabase/route-auth";
import { ingestDocument } from "@/lib/vectors/ingest";
import {
  isTutorDebugEnabled,
  logTutorTurn,
} from "@/lib/tutor/logger";
import {
  runTutorPipeline,
  streamDisplayChunks,
} from "@/lib/tutor/pipeline";
import type { RecentQuizSession } from "@/lib/tutor/learner-context";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const rate = await checkRateLimit(user.id);
  if (!rate.ok) {
    return NextResponse.json({ error: "Daily AI limit reached" }, { status: 429 });
  }

  const body = await request.json();
  const message = (body.message as string)?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const topicName = (body.topicName as string)?.trim() || null;
  const topicSlug = (body.topicSlug as string)?.trim() || null;
  const recentQuiz = (body.recentQuiz as RecentQuizSession | null) ?? null;

  let threadId = body.threadId as string | undefined;
  if (!threadId) {
    const { data: thread } = await supabase
      .from("tutor_threads")
      .insert({
        user_id: user.id,
        topic_slug: topicSlug,
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

  const { data: priorMessages } = await supabase
    .from("tutor_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(8);

  const recentTurns = (priorMessages ?? [])
    .slice(-6)
    .map((m) => ({
      role: m.role === "assistant" ? "tutor" : "student",
      content: m.content,
    }));

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const result = await runTutorPipeline({
          message,
          userId: user.id,
          supabase,
          topicName,
          topicSlug,
          recentTurns,
          recentQuiz,
        });

        const metaPayload: Record<string, unknown> = {
          type: "meta",
          threadId,
          sources: result.sources,
          structured: result.structured,
        };
        if (isTutorDebugEnabled() && result.debug) {
          metaPayload.debug = result.debug;
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(metaPayload)}\n\n`)
        );

        for (const chunk of streamDisplayChunks(result.displayText)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "token", text: chunk })}\n\n`)
          );
          await new Promise((r) => setTimeout(r, 12));
        }

        await supabase.from("tutor_messages").insert({
          thread_id: threadId,
          role: "assistant",
          content: result.displayText,
          citations: result.sources,
        });

        await ingestDocument({
          sourceType: "chat_turn",
          sourceId: `${threadId}-${Date.now()}`,
          userId: user.id,
          title: "Tutor exchange",
          text: `Q: ${message}\nA: ${result.displayText}`,
          metadata: { visibility: "private", threadId },
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } catch (e) {
        const err = e instanceof Error ? e.message : "Stream failed";
        logTutorTurn("tutor.error", { userId: user.id, error: err });
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
