import type { Metadata } from "next";
import { LeaderboardView } from "./LeaderboardView";

export const metadata: Metadata = {
  title: "Leaderboard — Recall AI",
};

export default function Page() {
  return <LeaderboardView />;
}
