import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/supabase/env";

export async function signInWithGoogle(next = "/dashboard") {
  const supabase = createClient();
  const redirectTo = `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}
