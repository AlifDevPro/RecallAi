"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  Flame,
  Minus,
  Target,
  TrendingUp,
  Zap,
  ChevronRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

type AnalyticsData = {
  avgMastery: number;
  totalReviews: number;
  totalDue: number;
  streak: number;
  insight: string;
  topics: { name: string; slug: string; mastery: number; trend: string; due: number; cards: number }[];
  weaknesses: { name: string; mastery: number; due: number; gap: number; trend: string }[];
  sessions: { date: string; type: string; cards: number; duration: string }[];
  activityDays: { date: string; weekday: string; count: number; level: string }[];
  weeklyTrend: { day: string; cards: number }[];
};

async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch("/api/me/analytics");
  if (!res.ok) throw new Error("Failed to load analytics");
  return res.json();
}

function MasteryRing({
  value,
  size = 160,
  stroke = 10,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color =
    value >= 80 ? "text-good" : value >= 60 ? "text-primary" : value >= 40 ? "text-hard" : "text-again";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-surface-raised"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={`${color} transition-all duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span className={`font-bold tabular-nums ${size < 100 ? "text-lg" : "text-3xl"}`}>{value}%</span>
        {label && (
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</span>
        )}
        {sublabel && <span className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}

function activityClass(level: string): string {
  if (level === "high") return "bg-primary";
  if (level === "medium") return "bg-primary/50";
  if (level === "low") return "bg-primary/25";
  return "bg-surface-raised";
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <ArrowUpRight className="size-4 text-good shrink-0" />;
  if (trend === "down") return <ArrowDownRight className="size-4 text-again shrink-0" />;
  return <Minus className="size-4 text-muted-foreground shrink-0" />;
}

function weaknessBarColor(mastery: number): string {
  if (mastery < 50) return "#ef4444";
  if (mastery < 70) return "#f59e0b";
  return "#6366f1";
}

export function AnalyticsView() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });

  const topics = data?.topics ?? [];
  const weaknesses = data?.weaknesses ?? [];
  const sessions = data?.sessions ?? [];
  const activityDays = data?.activityDays ?? [];
  const weeklyTrend = data?.weeklyTrend ?? [];
  const avgMastery = data?.avgMastery ?? 0;
  const weaknessChartData = weaknesses.map((w) => ({
    name: w.name.length > 14 ? `${w.name.slice(0, 12)}…` : w.name,
    fullName: w.name,
    mastery: w.mastery,
    gap: w.gap,
    due: w.due,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Sidebar streakDays={data?.streak} />
      <MobileNav streakDays={data?.streak} />

      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8 lg:py-12">
          <header className="mb-8">
            <p className="text-sm text-primary font-medium mb-1 flex items-center gap-1.5">
              <TrendingUp className="size-4" />
              Learning insights
            </p>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">Analytics</h1>
            <p className="text-muted-foreground max-w-2xl">
              Mastery trends, weak spots, and review activity — so you know exactly where to focus.
            </p>
          </header>

          {isError && (
            <div className="mb-6 p-4 rounded-xl bg-again/10 border border-again/30 text-sm text-again">
              Could not load analytics. Try refreshing the page.
            </div>
          )}

          {/* Insight */}
          {data?.insight && (
            <div className="mb-8 p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-surface to-accent/5 border border-primary/20 flex gap-4">
              <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <BrainCircuit className="size-5 text-primary" />
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{data.insight}</p>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Target}
              label="Avg mastery"
              value={isLoading ? "…" : `${avgMastery}%`}
              accent="text-primary"
              bg="bg-primary/10"
            />
            <StatCard
              icon={Zap}
              label="Cards reviewed"
              value={isLoading ? "…" : String(data?.totalReviews ?? 0)}
              accent="text-accent"
              bg="bg-accent/10"
              hint="Last 30 days"
            />
            <StatCard
              icon={Flame}
              label="Streak"
              value={isLoading ? "…" : `${data?.streak ?? 0} days`}
              accent="text-hard"
              bg="bg-hard/10"
            />
            <StatCard
              icon={BrainCircuit}
              label="Due now"
              value={isLoading ? "…" : String(data?.totalDue ?? 0)}
              accent="text-good"
              bg="bg-good/10"
              hint="Across all topics"
            />
          </div>

          {/* Hero rings + weekly chart */}
          <div className="grid lg:grid-cols-12 gap-6 mb-8">
            <section className="lg:col-span-4 p-6 rounded-2xl bg-surface border border-border/20 flex flex-col items-center justify-center">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 self-start w-full">
                Overall mastery
              </h2>
              {isLoading ? (
                <div className="size-40 rounded-full bg-surface-raised animate-pulse" />
              ) : (
                <MasteryRing value={avgMastery} label="Average" sublabel={`${topics.length} topics`} />
              )}
              {!isLoading && topics.length > 0 && (
                <div className="mt-6 w-full space-y-2">
                  {topics.slice(0, 3).map((t) => (
                    <Link
                      key={t.slug}
                      href={`/topics/${t.slug}`}
                      className="flex items-center justify-between text-sm hover:text-primary transition-colors group"
                    >
                      <span className="truncate text-muted-foreground group-hover:text-primary">{t.name}</span>
                      <span className="font-mono font-medium shrink-0 ml-2">{t.mastery}%</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="lg:col-span-8 p-6 rounded-2xl bg-surface border border-border/20">
              <h2 className="text-lg font-semibold mb-1">7-day review volume</h2>
              <p className="text-xs text-muted-foreground mb-4">Cards reviewed per day</p>
              {isLoading ? (
                <div className="h-48 bg-surface-raised rounded-xl animate-pulse" />
              ) : weeklyTrend.every((d) => d.cards === 0) ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                  No reviews this week yet.{" "}
                  <Link href="/review" className="text-primary hover:underline ml-1">
                    Start a session
                  </Link>
                </div>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--surface))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [`${value} cards`, "Reviewed"]}
                      />
                      <Bar dataKey="cards" radius={[6, 6, 0, 0]} maxBarSize={40}>
                        {weeklyTrend.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.cards > 0 ? "hsl(var(--primary))" : "hsl(var(--surface-raised))"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          {/* Topic rings + weakness chart */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <section className="p-6 rounded-2xl bg-surface border border-border/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Topic mastery</h2>
                <Link href="/topics" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  All topics <ChevronRight className="size-3" />
                </Link>
              </div>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-28 bg-surface-raised rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : topics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No topics yet.{" "}
                  <Link href="/topics/new" className="text-primary hover:underline">
                    Create one
                  </Link>
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {topics.slice(0, 6).map((t) => (
                    <Link
                      key={t.slug}
                      href={`/topics/${t.slug}`}
                      className="flex flex-col items-center p-3 rounded-xl bg-surface-raised/50 hover:bg-surface-raised transition-colors"
                    >
                      <MasteryRing value={t.mastery} size={88} stroke={7} label="" />
                      <p className="text-xs font-medium mt-2 text-center line-clamp-2 w-full">{t.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendIcon trend={t.trend} />
                        {t.due > 0 && (
                          <span className="text-[10px] text-again font-mono">{t.due} due</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="p-6 rounded-2xl bg-surface border border-border/20">
              <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Target className="size-4 text-again" />
                Weak areas
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Lowest mastery topics — focus here first</p>
              {isLoading ? (
                <div className="h-56 bg-surface-raised rounded-xl animate-pulse" />
              ) : weaknesses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No topics to analyze yet.</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weaknessChartData}
                      layout="vertical"
                      margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={72}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--surface))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, _name, props) => {
                          const p = props.payload as { fullName: string; due: number };
                          return [`${value}% mastery`, p.fullName + (p.due ? ` · ${p.due} due` : "")];
                        }}
                      />
                      <Bar dataKey="mastery" radius={[0, 4, 4, 0]} maxBarSize={16}>
                        {weaknessChartData.map((entry, i) => (
                          <Cell key={i} fill={weaknessBarColor(entry.mastery)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          {/* Activity heatmap */}
          <section className="p-6 rounded-2xl bg-surface border border-border/20 mb-8">
            <h2 className="text-lg font-semibold mb-1">30-day activity</h2>
            <p className="text-xs text-muted-foreground mb-4">Darker = more cards reviewed that day</p>
            {isLoading ? (
              <div className="h-24 bg-surface-raised rounded-xl animate-pulse" />
            ) : (
              <>
                <div className="w-full grid grid-flow-col grid-rows-7 auto-cols-fr gap-1 max-w-3xl">
                  {activityDays.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date}: ${day.count} cards`}
                      className={`aspect-square w-full min-w-0 rounded-[3px] ${activityClass(day.level)}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-3 text-[10px] text-muted-foreground max-w-3xl">
                  <span>30 days ago</span>
                  <span>{data?.totalReviews ?? 0} reviews total</span>
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-3 mt-4 text-[10px] text-muted-foreground">
                  <span>Less</span>
                  <div className="flex gap-1">
                    {["empty", "low", "medium", "high"].map((l) => (
                      <div key={l} className={`size-3 rounded-sm ${activityClass(l)}`} />
                    ))}
                  </div>
                  <span>More</span>
                </div>
              </>
            )}
          </section>

          {/* Recent sessions */}
          <section className="p-6 rounded-2xl bg-surface border border-border/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent sessions</h2>
              <Link href="/review" className="text-xs text-primary hover:underline">
                Review now
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-surface-raised rounded-lg animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No review sessions in the last 30 days.</p>
            ) : (
              <div className="divide-y divide-border/20">
                {sessions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Zap className="size-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{s.type}</p>
                        <p className="text-xs text-muted-foreground">{s.date}</p>
                      </div>
                    </div>
                    <div className="text-right text-muted-foreground font-mono text-xs">
                      <p>{s.cards} cards</p>
                      <p>{s.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  bg,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  hint?: string;
  accent: string;
  bg: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-surface border border-border/20">
      <div className={`size-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`size-4 ${accent}`} />
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
