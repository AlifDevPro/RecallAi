import { createServiceClient } from "@/lib/supabase/service";

const DAILY_LIMIT = 200;

export async function checkRateLimit(userId: string): Promise<{ ok: boolean; remaining: number }> {
  try {
    const supabase = createServiceClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabase
      .from("ai_rate_limits")
      .select("request_count")
      .eq("user_id", userId)
      .eq("day", today)
      .single();

    const count = data?.request_count ?? 0;
    if (count >= DAILY_LIMIT) {
      return { ok: false, remaining: 0 };
    }

    await supabase.from("ai_rate_limits").upsert({
      user_id: userId,
      day: today,
      request_count: count + 1,
    });

    return { ok: true, remaining: DAILY_LIMIT - count - 1 };
  } catch {
    return { ok: true, remaining: DAILY_LIMIT };
  }
}
