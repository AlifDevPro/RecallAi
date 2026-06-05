import type { Metadata } from "next";
import { QuizView } from "./QuizView";

export const metadata: Metadata = {
  title: "Quiz — Recall AI",
  description: "Test your understanding with AI-generated quiz questions.",
};

export default function Page() {
  return <QuizView />;
}
