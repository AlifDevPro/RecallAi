import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserSafe } from "@/lib/supabase/get-user-safe";
import { DashboardView } from "./DashboardView";

export const metadata: Metadata = {
  title: "Dashboard — Recall AI",
  description: "Your daily review queue, streak, and mastery overview.",
};

export default async function Page() {
  const supabase = await createClient();
  const { user } = await getUserSafe(supabase);

  if (!user) {
    redirect("/login");
  }

  return <DashboardView />;
}
