import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api/log-route-error";
import { requireUser } from "@/lib/supabase/route-auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function DELETE() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const service = createServiceClient();
    const { error } = await service.auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    logRouteError("DELETE /api/me/account", e, { userId: user.id });
    const message = e instanceof Error ? e.message : "Failed to delete account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
