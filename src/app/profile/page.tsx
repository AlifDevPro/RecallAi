import type { Metadata } from "next";
import { ProfileView } from "./ProfileView";

export const metadata: Metadata = {
  title: "Your profile — Recall AI",
  description: "Your Recall AI profile, stats, achievements and learning identity.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
