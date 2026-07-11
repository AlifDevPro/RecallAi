import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BD_UNIVERSITIES } from "@/lib/data/bd-institutions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";

  const supabase = await createClient();
  let query = supabase.from("institutions").select("id, name, country").order("name");

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: rows } = await query;

  let institutions = [...BD_UNIVERSITIES];
  if (rows && rows.length > 0) {
    const fromDb = rows.map((r) => r.name);
    institutions = Array.from(new Set([...fromDb, ...BD_UNIVERSITIES])).sort();
    if (q) institutions = institutions.filter((n) => n.toLowerCase().includes(q));
    return NextResponse.json({ institutions });
  }

  if (q) institutions = institutions.filter((n) => n.toLowerCase().includes(q));
  return NextResponse.json({ institutions });
}
