import type { Metadata } from "next";
import { NotificationsView } from "./NotificationsView";

export const metadata: Metadata = {
  title: "Notifications — Recall AI",
  description: "Reminders, achievements, and AI insights.",
};

export default function Page() {
  return <NotificationsView />;
}
