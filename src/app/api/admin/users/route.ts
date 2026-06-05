import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role === "admin";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: profiles } = await service
    .from("profiles")
    .select("id, display_name, email, plan, role, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.display_name ?? p.email?.split("@")[0] ?? "User",
    email: p.email ?? "",
    plan: (p.plan ?? "free").charAt(0).toUpperCase() + (p.plan ?? "free").slice(1),
    role: p.role === "admin" ? "admin" : "member",
    joined: new Date(p.created_at).toLocaleDateString(),
    streak: 0,
    status: "active" as const,
    verified: true,
    mfa: false,
    lastSeen: "—",
  }));

  return NextResponse.json({ users });
}
