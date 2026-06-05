import type { Metadata } from "next";
import { ContributorsView } from "./ContributorsView";

export const metadata: Metadata = {
  title: "Contributors — Recall AI Question Bank",
  description: "The community curating past papers from every institution.",
  openGraph: {
    title: "Contributors — Recall AI",
  },
};

export default function Page() {
  return <ContributorsView />;
}
