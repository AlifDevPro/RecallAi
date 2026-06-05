"use client";

import { useEffect, useState } from "react";
import { Trophy, Flame, Crown, Medal, TrendingUp, Globe2, Users } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

const PEOPLE = [
  { name: "Maya Patel", handle: "@maya", xp: { d: 1280, w: 8420, m: 32140 }, streak: 62, country: "🇮🇳" },
  { name: "Lukas Berg", handle: "@lukas", xp: { d: 1140, w: 7980, m: 30210 }, streak: 41, country: "🇩🇪" },
  { name: "Aiko Tanaka", handle: "@aiko", xp: { d: 1095, w: 7420, m: 29010 }, streak: 88, country: "🇯🇵" },
  { name: "Diego Ruiz", handle: "@diego", xp: { d: 980, w: 6840, m: 27520 }, streak: 27, country: "🇪🇸" },
  { name: "Alex Chen (you)", handle: "@alexc", xp: { d: 820, w: 5210, m: 22480 }, streak: 14, country: "🇺🇸", me: true },
  { name: "Noor Hassan", handle: "@noor", xp: { d: 760, w: 4980, m: 21010 }, streak: 19, country: "🇦🇪" },
  { name: "Sofia Rossi", handle: "@sofia", xp: { d: 690, w: 4520, m: 19840 }, streak: 33, country: "🇮🇹" },
  { name: "Jordan Lee", handle: "@jord", xp: { d: 640, w: 4210, m: 18760 }, streak: 11, country: "🇨🇦" },
];

export function LeaderboardView() {
  const [period, setPeriod] = useState<"d" | "w" | "m">("w");
  const [scope, setScope] = useState<"global" | "friends">("global");
  const [people, setPeople] = useState(PEOPLE);

  useEffect(() => {
    fetch(`/api/public/leaderboard?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        const mapped = (d.people ?? []).map(
          (p: { rank: number; name: string; streak: number; cards: number; xp?: number; userId?: string }) => ({
            name: p.name,
            handle: p.userId ? `@${p.userId.slice(0, 8)}` : `@user${p.rank}`,
            xp: { d: p.xp ?? p.cards, w: p.xp ?? p.cards, m: p.xp ?? p.cards },
            streak: p.streak,
            country: "🌍",
            me: false,
          })
        );
        if (mapped.length) setPeople(mapped);
      })
      .catch(() => {});
  }, [period]);

  const ranked = [...people].sort((a, b) => b.xp[period] - a.xp[period]);
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const me = ranked.findIndex((p) => p.me) + 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-8 lg:py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 text-accent text-[11px] font-mono font-semibold uppercase tracking-wider mb-2">
                <Trophy className="size-3" /> Leaderboard
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Top learners</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Rank by XP earned from reviews, quizzes and streak bonuses.
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <div className="inline-flex p-1 rounded-xl bg-surface border border-border/40">
                {(["d", "w", "m"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "d" ? "Daily" : p === "w" ? "Weekly" : "Monthly"}
                  </button>
                ))}
              </div>
              <div className="inline-flex p-1 rounded-xl bg-surface border border-border/40">
                {([
                  ["global", Globe2, "Global"],
                  ["friends", Users, "Friends"],
                ] as const).map(([k, Icon, label]) => (
                  <button
                    key={k}
                    onClick={() => setScope(k)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                      scope === k ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Podium */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 items-end">
            {[1, 0, 2].map((order, i) => {
              const p = podium[order];
              if (!p) return <div key={i} />;
              const heights = ["h-32 sm:h-36", "h-40 sm:h-48", "h-24 sm:h-28"];
              const medals = [Medal, Crown, Medal];
              const M = medals[i];
              const colors = ["text-muted-foreground", "text-accent", "text-hard"];
              return (
                <div key={p.name} className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <div className={`size-14 sm:size-16 rounded-2xl bg-gradient-to-br from-primary to-accent ring-4 ring-background flex items-center justify-center text-base sm:text-lg font-bold text-primary-foreground`}>
                      {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <M className={`absolute -top-2 -right-2 size-6 ${colors[i]} drop-shadow`} />
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-foreground text-center truncate max-w-[110px]">{p.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{p.handle}</div>
                  <div className={`w-full ${heights[i]} mt-3 rounded-t-2xl border-x border-t border-border/40 bg-gradient-to-b from-primary/15 to-transparent flex flex-col items-center justify-start pt-3`}>
                    <span className={`text-xl sm:text-2xl font-bold tabular-nums ${i === 1 ? "text-accent" : "text-foreground"}`}>
                      {p.xp[period].toLocaleString()}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">XP</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Your rank highlight */}
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-transparent to-accent/10 border border-primary/30 flex items-center gap-4">
            <div className="size-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold tabular-nums">
              #{me}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">You&apos;re climbing</div>
              <div className="text-xs text-muted-foreground">Pass <span className="text-foreground font-medium">Diego Ruiz</span> with 160 more XP today.</div>
            </div>
            <TrendingUp className="size-5 text-good shrink-0" />
          </div>

          {/* Full list */}
          <div className="rounded-2xl bg-surface border border-border/40 overflow-hidden">
            <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
              <span>Rank · learner</span>
              <span>XP / streak</span>
            </div>
            <ul>
              {rest.map((p, i) => {
                const rank = i + 4;
                return (
                  <li
                    key={p.name}
                    className={`px-5 py-3 flex items-center gap-4 border-b border-border/20 last:border-0 ${
                      p.me ? "bg-primary/10" : "hover:bg-surface-raised/40"
                    }`}
                  >
                    <span className="w-7 text-sm font-mono font-semibold text-muted-foreground tabular-nums">
                      {rank}
                    </span>
                    <div className="size-9 rounded-lg bg-gradient-to-br from-primary/70 to-accent/70 flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                      {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                        {p.name} <span className="text-base leading-none">{p.country}</span>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">{p.handle}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold tabular-nums text-foreground">
                        {p.xp[period].toLocaleString()}
                      </div>
                      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1 justify-end">
                        <Flame className="size-3 text-hard" /> {p.streak}d
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
