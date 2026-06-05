import type { Metadata } from "next";
import { MockHubView } from "./MockHubView";

export const metadata: Metadata = {
  title: "Mock Tests — Recall AI",
  description: "Sit a global or institution-modelled mock exam with strict timing and AI evaluation.",
};

export default function Page() {
  return <MockHubView />;
}
