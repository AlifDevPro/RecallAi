import type { Metadata } from "next";
import { ContributorProfileView } from "./ContributorProfileView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  return {
    title: `Contributor ${userId} — Recall AI`,
  };
}

export default async function ContributorProfile({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <ContributorProfileView userId={userId} />;
}
