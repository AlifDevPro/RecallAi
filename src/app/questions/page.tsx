import type { Metadata } from "next";
import { BankView } from "./BankView";

export const metadata: Metadata = {
  title: "Question Bank — Real past papers, digital + scan",
  description: "Browse real past question papers from every institution. Switch between AI-cleaned digital text and the original scanned photo.",
  openGraph: {
    title: "Question Bank — Recall AI",
    description: "Past papers archive with digital + photo views and advanced filters.",
  },
};

export default function Page() {
  return <BankView />;
}
