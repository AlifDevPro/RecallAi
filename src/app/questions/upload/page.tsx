import type { Metadata } from "next";
import { UploadView } from "./UploadView";

export const metadata: Metadata = {
  title: "Contribute questions — Recall AI",
};

export default function Page() {
  return <UploadView />;
}
