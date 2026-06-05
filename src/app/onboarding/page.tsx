import type { Metadata } from "next";
import { OnboardingView } from "./OnboardingView";

export const metadata: Metadata = {
  title: "Get started — Recall AI",
  description: "Create your account and set up your personalized learning plan in under 2 minutes.",
};

export default function Page() {
  return <OnboardingView />;
}
