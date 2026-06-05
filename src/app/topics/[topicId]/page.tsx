import type { Metadata } from "next";
import { TopicDetailView } from "./TopicDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topicId: string }>;
}): Promise<Metadata> {
  const { topicId } = await params;
  return {
    title: `${topicId} — Recall AI`,
    description: "Topic detail, roadmap, and AI summary.",
  };
}

export default function Page() {
  return <TopicDetailView />;
}
