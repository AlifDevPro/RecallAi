import type { Metadata } from "next";
import { MockHistoryView } from "./MockHistoryView";

export const metadata: Metadata = {
  title: "Mock history — Recall AI",
};

export default function Page() {
  return <MockHistoryView />;
}
