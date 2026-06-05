import type { Metadata } from "next";
import { AddTopicView } from "./AddTopicView";

export const metadata: Metadata = {
  title: "Add Topic — Recall AI",
  description: "Create a new learning topic.",
};

export default function Page() {
  return <AddTopicView />;
}
