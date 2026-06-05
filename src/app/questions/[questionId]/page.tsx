import type { Metadata } from "next";
import { Suspense } from "react";
import { PaperDetailView } from "./PaperDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ questionId: string }>;
}): Promise<Metadata> {
  const { questionId } = await params;
  return {
    title: `${questionId} — Recall AI Question Bank`,
  };
}

export default function Page() {
  return (
    <Suspense>
      <PaperDetailView />
    </Suspense>
  );
}
