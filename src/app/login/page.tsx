import type { Metadata } from "next";
import { LoginView } from "./LoginView";

export const metadata: Metadata = {
  title: "Sign in — Recall AI",
  description: "Sign in to your Recall AI account.",
};

export default function Page() {
  return <LoginView />;
}
