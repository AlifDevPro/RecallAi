import type { Metadata } from "next";
import { ExamRuntimeView } from "./ExamRuntimeView";

export const metadata: Metadata = {
  title: "Exam in progress — Recall AI",
};

export default function Page() {
  return <ExamRuntimeView />;
}
