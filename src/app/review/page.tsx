import type { Metadata } from "next";
import { ReviewView } from "./ReviewView";

export const metadata: Metadata = {
  title: "Review Session — Recall AI",
  description: "Daily spaced repetition review session.",
};

export default function Page() {
  return <ReviewView />;
}
