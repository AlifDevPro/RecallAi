"use client";

import { useEffect, useState } from "react";
import {
  Minus,
  BrainCircuit,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { InsightBanner } from "./InsightBanner";

type AnalyticsData = {
  avgMastery: number;
  totalReviews: number;
  streak: number;
  topics: { name: string; mastery: number; trend: string }[];
  weaknesses: { concept: string; topic: string; wrongRate: number }[];
  sessions: { date: string; type: string; cards: number; accuracy: number; duration: string }[];
  heatmapData: number[][];
};

export function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch("/api/me/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const topics = data?.topics ?? [];
  const weaknesses = data?.weaknesses ?? [];
  const sessions = data?.sessions ?? [];
  const heatmapData = data?.heatmapData ?? [];
  const avgMastery = data?.avgMastery ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar streakDays={data?.streak} />
      <MobileNav />

      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8 lg:py-12">
          <header className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Analytics</h1>
            <p className="text-muted-foreground">Understand your memory and focus on what matters.</p>
          </header>

          <InsightBanner />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Stat label="Avg Mastery" value={`${avgMastery}%`} />
            <Stat label="Total Reviews" value={String(data?.totalReviews ?? 0)} />
            <Stat label="Study Streak" value={`${data?.streak ?? 0} days`} />
            <Stat label="Topics" value={String(topics.length)} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <section className="p-6 rounded-2xl bg-surface border border-border/20">
              <h2 className="text-lg font-semibold mb-4">Topic mastery</h2>
              <div className="space-y-3">
                {topics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No topics yet.</p>
                ) : (
                  topics.map((t) => (
                    <div key={t.name} className="flex items-center gap-3">
                      <span className="text-sm flex-1 truncate">{t.name}</span>
                      {t.trend === "up" ? <ArrowUpRight className="size-4 text-good" /> : t.trend === "down" ? <ArrowDownRight className="size-4 text-again" /> : <Minus className="size-4 text-muted-foreground" />}
                      <span className="text-sm font-mono font-bold w-12 text-right">{t.mastery}%</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="p-6 rounded-2xl bg-surface border border-border/20">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Target className="size-4" /> Weak areas</h2>
              <div className="space-y-2">
                {weaknesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No weak areas detected.</p>
                ) : (
                  weaknesses.map((w) => (
                    <div key={w.concept} className="flex justify-between text-sm p-2 rounded-lg bg-surface-raised/50">
                      <span>{w.concept}</span>
                      <span className="text-again font-mono">{w.wrongRate}% gap</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {heatmapData.length > 0 && (
            <section className="p-6 rounded-2xl bg-surface border border-border/20 mb-8">
              <h2 className="text-lg font-semibold mb-4">30-day activity heatmap</h2>
              <div className="space-y-1">
                {heatmapData.map((row, i) => (
                  <div key={i} className="flex gap-0.5">
                    {row.map((v, j) => (
                      <div key={j} className="flex-1 h-3 rounded-sm bg-primary" style={{ opacity: Math.max(0.1, v) }} />
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="p-6 rounded-2xl bg-surface border border-border/20">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="size-4" /> Recent sessions</h2>
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No review sessions yet.</p>
              ) : (
                sessions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-raised/50 text-sm">
                    <div>
                      <span className="font-medium">{s.type}</span>
                      <span className="text-muted-foreground ml-2">{s.date}</span>
                    </div>
                    <div className="text-muted-foreground">{s.cards} cards · {s.duration}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 rounded-2xl bg-surface border border-border/20">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
