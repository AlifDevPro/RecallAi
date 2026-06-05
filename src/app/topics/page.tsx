import type { Metadata } from "next";
import { TopicsView } from "./TopicsView";

export const metadata: Metadata = {
  title: "Topics — Recall AI",
  description: "Manage your learning topics and decks.",
};

export default function Page() {
  return <TopicsView />;
}
