import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDashboard } from "@/lib/dashboard/get-dashboard";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await getDashboard(supabase, user.id);
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
