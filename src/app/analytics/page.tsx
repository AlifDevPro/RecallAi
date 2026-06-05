import type { Metadata } from "next";
import { AnalyticsView } from "./AnalyticsView";

export const metadata: Metadata = {
  title: "Analytics — Recall AI",
  description: "Track your learning progress and identify weak areas.",
};

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
