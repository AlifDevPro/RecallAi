import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboard } from "@/lib/dashboard/get-dashboard";
import { DashboardView } from "./DashboardView";

export const metadata: Metadata = {
  title: "Dashboard — Recall AI",
  description: "Your daily review queue, streak, and mastery overview.",
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialData = await getDashboard(supabase, user.id);

  return <DashboardView initialData={initialData} />;
}
