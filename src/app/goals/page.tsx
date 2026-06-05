import type { Metadata } from "next";
import { GoalsClient } from "./GoalsClient";

export const metadata: Metadata = {
  title: "Goals — Recall AI",
  description: "Track your long-term learning objectives.",
};

export default function GoalsPage() {
  return <GoalsClient />;
}
