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
  since.setDate(since.getDate() - 30);

  const { data: reviews } = await service
    .from("review_events")
    .select("reviewed_at, user_id")
    .gte("reviewed_at", since.toISOString());

  const byDay = new Map<string, Set<string>>();
  for (const r of reviews ?? []) {
    const day = r.reviewed_at.slice(0, 10);
    const set = byDay.get(day) ?? new Set();
    set.add(r.user_id);
    byDay.set(day, set);
  }

  const dailyActive: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyActive.push(byDay.get(key)?.size ?? 0);
  }

  const { data: profiles } = await service.from("profiles").select("plan");
  const planCounts = { free: 0, pro: 0, team: 0 };
  for (const p of profiles ?? []) {
    const plan = (p.plan ?? "free") as keyof typeof planCounts;
    if (plan in planCounts) planCounts[plan]++;
  }
  const total = profiles?.length ?? 1;

  const { data: topics } = await service.from("topics").select("name");
  const topicCounts = new Map<string, number>();
  for (const t of topics ?? []) {
    topicCounts.set(t.name, (topicCounts.get(t.name) ?? 0) + 1);
  }
  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const { count: submissionCount } = await service
    .from("question_submissions")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    dailyActive,
    planDistribution: {
      free: Math.round((planCounts.free / total) * 100),
      pro: Math.round((planCounts.pro / total) * 100),
      team: Math.round((planCounts.team / total) * 100),
    },
    topTopics,
    totalUsers: profiles?.length ?? 0,
    totalSubmissions: submissionCount ?? 0,
  });
}
