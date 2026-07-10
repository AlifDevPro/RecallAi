import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CONTRIBUTORS } from "@/lib/data/contributors";
import { mapContributorRows } from "@/lib/contributors/map-contributors";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "all";

  let since: Date | null = null;
  if (range === "week") {
    since = new Date();
    since.setDate(since.getDate() - 7);
  } else if (range === "month") {
    since = new Date();
    since.setDate(since.getDate() - 30);
  }

  let query = supabase
    .from("contributors")
    .select("id, contributions, accuracy, verified, institution, tier, created_at")
    .order("contributions", { ascending: false })
    .limit(50);

  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { data: rows } = await query;

  if (rows && rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email, avatar_url")
      .in("id", ids);

    const contributors = mapContributorRows(rows, profiles ?? []);
    return NextResponse.json({ contributors });
  }

  return NextResponse.json({ contributors: CONTRIBUTORS });
}
