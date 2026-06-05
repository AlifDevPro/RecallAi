import type { Metadata } from "next";
import { SettingsView } from "./SettingsView";

export const metadata: Metadata = {
  title: "Settings — Recall AI",
  description: "Configure your Recall AI preferences.",
};

export default function Page() {
  return <SettingsView />;
}
