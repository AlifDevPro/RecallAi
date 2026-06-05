import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type UsageEntry = {
  userId?: string | null;
  provider: string;
  model: string;
  route: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function logAiUsage(entry: UsageEntry): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const client = getServiceClient();
  if (!client) return;

  try {
    await client.from("ai_usage_logs").insert({
      user_id: entry.userId ?? null,
      provider: entry.provider,
      model: entry.model,
      route: entry.route,
      tokens_in: entry.tokensIn,
      tokens_out: entry.tokensOut,
      latency_ms: entry.latencyMs,
    });
  } catch {
    // Non-blocking
  }
}
