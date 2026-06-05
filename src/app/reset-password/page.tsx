import type { Metadata } from "next";
import { ResetPasswordView } from "./ResetPasswordView";

export const metadata: Metadata = {
  title: "Set a new password — Recall AI",
  description: "Choose a new password for your Recall AI account.",
};

export default function Page() {
  return <ResetPasswordView />;
}
