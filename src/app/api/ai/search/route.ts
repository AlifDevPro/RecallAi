import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchContent } from "@/lib/vectors/search";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await request.json();
  const query = (body.query as string)?.trim();
  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const matches = await searchContent(query, {
    userId: user?.id ?? null,
    includePublic: true,
    matchCount: body.limit ?? 12,
  });

  const results = matches.map((m) => ({
    content: m.content,
    sourceType: m.sourceType,
    sourceId: m.sourceId,
    title: m.title,
    similarity: m.similarity,
    href:
      m.sourceType === "question"
        ? `/questions/${m.sourceId}`
        : m.sourceType === "paper"
          ? `/questions/${m.sourceId}`
          : m.sourceType === "topic"
            ? `/topics/${m.sourceId}`
            : m.sourceType === "card"
              ? `/review`
              : "/dashboard",
  }));

  return NextResponse.json({ results });
}
