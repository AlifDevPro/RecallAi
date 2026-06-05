import type { Metadata } from "next";
import { ForgotPasswordView } from "./ForgotPasswordView";

export const metadata: Metadata = {
  title: "Reset your password — Recall AI",
  description: "Request a reset link for your Recall AI account.",
};

export default function Page() {
  return <ForgotPasswordView />;
}
