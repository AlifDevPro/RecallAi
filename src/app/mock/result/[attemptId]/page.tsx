import type { Metadata } from "next";
import { ResultView } from "./ResultView";

export const metadata: Metadata = {
  title: "Exam result — Recall AI",
};

export default function Page() {
  return <ResultView />;
}
