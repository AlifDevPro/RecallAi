import type { Metadata } from "next";
import { TutorView } from "./TutorView";

export const metadata: Metadata = {
  title: "AI Tutor — Recall AI",
  description: "Get contextual help from your AI tutor.",
};

export default function Page() {
  return <TutorView />;
}
