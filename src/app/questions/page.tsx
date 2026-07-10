import { Suspense } from "react";
import type { Metadata } from "next";
import { BankView } from "./BankView";

export const metadata: Metadata = {
  title: "Question Bank — Real past papers",
  description: "Browse verified past exam papers from every institution. View original scans and generate mock exams.",
  openGraph: {
    title: "Question Bank — Recall AI",
    description: "Past papers archive with scan previews and advanced filters.",
  },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
          Loading question bank…
        </div>
      }
    >
      <BankView />
    </Suspense>
  );
}
