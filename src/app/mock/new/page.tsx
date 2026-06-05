import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfigureView } from "./ConfigureView";

export const metadata: Metadata = {
  title: "Configure Mock — Recall AI",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ConfigureView />
    </Suspense>
  );
}
