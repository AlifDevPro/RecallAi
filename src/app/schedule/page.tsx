import type { Metadata } from "next";
import { ScheduleView } from "./ScheduleView";

export const metadata: Metadata = {
  title: "Schedule — Recall AI",
  description:
    "AI-generated personalized daily schedule blending reviews, new learning, recall and your personal goals.",
};

export default function Page() {
  return <ScheduleView />;
}
