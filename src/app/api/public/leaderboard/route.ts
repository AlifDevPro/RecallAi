import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FIXTURE = [
  { rank: 1, name: "Asha M.", streak: 42, cards: 1240, userId: "u1" },
  { rank: 2, name: "Ravi K.", streak: 38, cards: 1102, userId: "u2" },
  { rank: 3, name: "Lin W.", streak: 35, cards: 980, userId: "u3" },
];

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const days = [...new Set(dates.map((d) => d.slice(0, 10)))].sort().reverse();
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.includes(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1);
      const y = cursor.toISOString().slice(0, 10);
      if (days.includes(y)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    } else break;
  }
  return streak;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "w";
  const days = period === "d" ? 1 : period === "m" ? 30 : 7;

  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: events } = await supabase
    .from("review_events")
    .select("user_id, cards_reviewed, reviewed_at")
    .gte("reviewed_at", since.toISOString());

  if (!events?.length) {
    return NextResponse.json({ people: FIXTURE, source: "fixture" });
  }

  const cardsByUser = new Map<string, number>();
  const datesByUser = new Map<string, string[]>();

  for (const e of events) {
    cardsByUser.set(e.user_id, (cardsByUser.get(e.user_id) ?? 0) + e.cards_reviewed);
    const list = datesByUser.get(e.user_id) ?? [];
    list.push(e.reviewed_at);
    datesByUser.set(e.user_id, list);
  }

  const ids = Array.from(cardsByUser.keys());
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "Learner"]));

  const people = Array.from(cardsByUser.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([userId, cards], i) => ({
      rank: i + 1,
      userId,
      name: nameById.get(userId) ?? "Learner",
      streak: computeStreak(datesByUser.get(userId) ?? []),
      cards,
      xp: cards,
    }));

  return NextResponse.json({ people: people.length ? people : FIXTURE, source: "db" });
}
