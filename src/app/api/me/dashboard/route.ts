import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/dashboard/get-dashboard";
import { requireUser } from "@/lib/supabase/route-auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const payload = await getDashboard(auth.supabase, auth.user.id);
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
