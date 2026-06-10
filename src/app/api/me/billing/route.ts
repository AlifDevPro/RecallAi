import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/route-auth";
import { createServiceClient } from "@/lib/supabase/service";

const MONTHLY_AI_QUOTA = 1000;

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan ?? "free";
  const quota = plan === "pro" || plan === "team" ? 10000 : MONTHLY_AI_QUOTA;

  const service = createServiceClient();
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const { data: logs } = await service
    .from("ai_usage_logs")
    .select("tokens_in, tokens_out")
    .eq("user_id", user.id)
    .gte("created_at", since.toISOString());

  const used = (logs ?? []).reduce((s, l) => s + l.tokens_in + l.tokens_out, 0);
  const usedPct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

  return NextResponse.json({
    plan,
    quota,
    used,
    usedPct,
    invoices: [],
  });
}
