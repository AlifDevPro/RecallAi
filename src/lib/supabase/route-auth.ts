import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserSafe } from "@/lib/supabase/get-user-safe";

export async function requireUser() {
  const supabase = await createClient();
  const { user, invalidSession } = await getUserSafe(supabase);

  if (!user) {
    return {
      supabase,
      user: null as null,
      response: NextResponse.json(
        { error: invalidSession ? "Session expired" : "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { supabase, user, response: null as null };
}
