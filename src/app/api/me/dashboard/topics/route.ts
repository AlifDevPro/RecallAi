import { NextResponse } from "next/server";
import { getDashboardTopics } from "@/lib/dashboard/get-dashboard";
import { requireUser } from "@/lib/supabase/route-auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const topics = await getDashboardTopics(auth.supabase, auth.user.id);
    return NextResponse.json({ topics });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load topics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
