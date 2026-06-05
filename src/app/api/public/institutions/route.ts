import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UNIVERSITIES } from "@/lib/data/question-papers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";

  const supabase = await createClient();
  let query = supabase.from("institutions").select("id, name, country").order("name");

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: rows } = await query;

  if (rows && rows.length > 0) {
    const institutions = rows.map((r) => r.name);
    return NextResponse.json({ institutions });
  }

  let institutions = UNIVERSITIES;
  if (q) institutions = institutions.filter((n) => n.toLowerCase().includes(q));
  return NextResponse.json({ institutions });
}
