import type { Metadata } from "next";
import { SignupView } from "./SignupView";

export const metadata: Metadata = {
  title: "Create account — Recall AI",
  description: "Create your Recall AI account in seconds.",
};

export default function Page() {
  return <SignupView />;
}
