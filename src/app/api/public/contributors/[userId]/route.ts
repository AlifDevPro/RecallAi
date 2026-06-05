import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CONTRIBUTORS } from "@/lib/data/contributors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("contributors")
    .select("id, contributions, accuracy, verified, institution, tier")
    .eq("id", userId)
    .single();

  if (row) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", userId)
      .single();
    return NextResponse.json({
      contributor: {
        id: row.id,
        name: profile?.display_name ?? profile?.email?.split("@")[0] ?? "Contributor",
        contributions: row.contributions,
        accuracy: Number(row.accuracy),
        verified: row.verified,
        inst: row.institution,
        tier: row.tier,
        avatarUrl: `https://i.pravatar.cc/240?u=${row.id}`,
      },
    });
  }

  const fixture = CONTRIBUTORS.find((c) => c.id === userId);
  if (!fixture) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ contributor: fixture });
}
