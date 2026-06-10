import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/route-auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data: events, error } = await supabase
    .from("review_events")
    .select("id, reviewed_at, cards_reviewed")
    .eq("user_id", user.id)
    .order("reviewed_at", { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    events: events ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="recall-reviews-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
