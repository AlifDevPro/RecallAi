import type { Metadata } from "next";
import { EditProfileView } from "./EditProfileView";

export const metadata: Metadata = {
  title: "Edit profile — Recall AI",
};

export default function Page() {
  return <EditProfileView />;
}
