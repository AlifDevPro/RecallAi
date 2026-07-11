import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithFailover } from "@/lib/ai/router";
import { isGroqConfigured } from "@/lib/ai/config";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { searchContent, formatRagContext } from "@/lib/vectors/search";
import { validateMockConfig, sectionTotal } from "@/lib/mock/validate-config";
import { isMissingCorrectIndexColumn } from "@/lib/mock/schema-compat";


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

  let config;
  try {
    const body = await request.json();
    config = validateMockConfig(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid configuration";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const questionCount = sectionTotal(config.sections);
  const topics = config.topics;

  try {
    let paperContext = "";
    if (config.paperId) {
      const { data: paper } = await supabase
        .from("papers")
        .select("course, course_title, university, year")
        .eq("id", config.paperId)
        .single();
      if (paper) {
        paperContext = `Reference paper: ${paper.course_title} (${paper.course}, ${paper.university}, ${paper.year})`;
      }
    }

    const ragQuery = [
      config.paperId,
      topics.join(" "),
      config.mode === "institutional" ? config.institutions.join(" ") : "",
    ]
      .filter(Boolean)
      .join(" ");

    const rag = await searchContent(ragQuery, { userId: user.id, includePublic: true });

    const sectionSpec = `MCQ: ${config.sections.mcq}, Short: ${config.sections.short}, Long: ${config.sections.long}, Numerical: ${config.sections.numerical}`;
    const bloomSpec = config.bloom.length ? config.bloom.join(", ") : "mixed Bloom levels";
    const instSpec =
      config.mode === "institutional"
        ? `Institutional mode — institutions: ${config.institutions.join(", ") || "any"}, years ${config.yearFrom}–${config.yearTo}`
        : "Global curated pool";

    const { text } = await generateWithFailover(
      `Create a mock exam with exactly ${questionCount} questions.
Topics: ${topics.join(", ")}
${instSpec}
Bloom: ${bloomSpec}
Section mix: ${sectionSpec}
Duration budget: ${config.duration} minutes
${paperContext}

Context from knowledge base:
${formatRagContext(rag)}

Return JSON: { "title": string, "questions": [{ "body": string, "marks": number, "topic": string, "section": "MCQ"|"Short"|"Long"|"Numerical", "choices"?: string[], "correctIndex"?: number }] }
For MCQ questions include exactly 4 choices and correctIndex (0-based).`,
      { json: true, route: "mock-generate", userId: user.id }
    );

    let parsed: {
      title?: string;
      questions?: {
        body: string;
        marks: number;
        topic: string;
        section?: string;
        choices?: string[];
        correctIndex?: number;
      }[];
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Failed to parse mock exam" }, { status: 500 });
    }

    const questions = parsed.questions ?? [];
    if (questions.length === 0) {
      return NextResponse.json({ error: "No questions were generated" }, { status: 422 });
    }

    if (questions.length < questionCount) {
      console.warn(
        `Mock generate: expected ${questionCount} questions, got ${questions.length}`
      );
    }

    const configWithOrder = { ...config, questionOrder: undefined as string[] | undefined };

    const { data: attempt, error: attemptError } = await supabase
      .from("mock_attempts")
      .insert({
        user_id: user.id,
        title: parsed.title ?? `Mock — ${topics[0] ?? "General"}`,
        topics,
        duration_min: config.duration,
        config: configWithOrder,
      })
      .select("id")
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: attemptError?.message ?? "Failed to save attempt" },
        { status: 500 }
      );
    }

    const rows = questions.map((q, i) => {
      const correctIndex =
        q.correctIndex != null && Number.isInteger(q.correctIndex) ? q.correctIndex : null;
      return {
        attempt_id: attempt.id,
        sort_order: i,
        body: q.body,
        marks: q.marks ?? 5,
        topic: q.topic ?? topics[0] ?? "",
        section: q.section ?? "Short",
        choices: q.choices ? { options: q.choices, correctIndex } : null,
        correct_index: correctIndex,
      };
    });

    const { error: qError } = await supabase.from("mock_questions").insert(rows);
    if (qError) {
      if (!isMissingCorrectIndexColumn(qError)) {
        return NextResponse.json({ error: qError.message }, { status: 500 });
      }

      const compatibleRows = rows.map((row) => ({
        attempt_id: row.attempt_id,
        sort_order: row.sort_order,
        body: row.body,
        marks: row.marks,
        topic: row.topic,
        section: row.section,
        choices: row.choices,
      }));
      const { error: retryError } = await supabase.from("mock_questions").insert(compatibleRows);
      if (retryError) {
        return NextResponse.json({ error: retryError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ attemptId: attempt.id, questionCount: rows.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Mock generation failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
