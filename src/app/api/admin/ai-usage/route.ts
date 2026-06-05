import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role === "admin";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: logs } = await service
    .from("ai_usage_logs")
    .select("provider, model, route, tokens_in, tokens_out, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  const byModel = new Map<
    string,
    { model: string; provider: string; calls: number; tokensIn: number; tokensOut: number }
  >();

  for (const log of logs ?? []) {
    const key = `${log.provider}:${log.model}`;
    const cur = byModel.get(key) ?? {
      model: log.model,
      provider: log.provider,
      calls: 0,
      tokensIn: 0,
      tokensOut: 0,
    };
    cur.calls++;
    cur.tokensIn += log.tokens_in;
    cur.tokensOut += log.tokens_out;
    byModel.set(key, cur);
  }

  return NextResponse.json({
    summary: Array.from(byModel.values()),
    recent: (logs ?? []).slice(0, 20),
  });
}
