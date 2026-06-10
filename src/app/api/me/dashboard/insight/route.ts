import { NextResponse } from "next/server";
import { getDashboardInsight } from "@/lib/dashboard/get-dashboard";
import { requireUser } from "@/lib/supabase/route-auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const insight = await getDashboardInsight(auth.supabase, auth.user.id);
    return NextResponse.json({ insight });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load insight";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
