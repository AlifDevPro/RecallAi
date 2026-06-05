"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Zap,
  TrendingUp,
  Minus,
  Calendar,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { DashboardSkeletonContent } from "@/components/dashboard/DashboardSkeleton";
import type { DashboardPayload } from "@/lib/data/dashboard";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

async function fetchDashboard(): Promise<DashboardPayload> {
  const res = await fetch("/api/me/dashboard");
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

type DashboardViewProps = {
  initialData?: DashboardPayload;
};

export function DashboardView({ initialData }: DashboardViewProps) {
  const queryClient = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    initialData,
    staleTime: 60_000,
  });

  const topics = data?.topics ?? [];
  const forecast = data?.forecast ?? [];
  const activityGrid = data?.activityGrid ?? [];
  const displayName = data?.displayName ?? "there";
  const streakDays = data?.streakDays ?? 0;
  const insight = data?.insight ?? "";
  const minutesPerCard = data?.minutesPerCard ?? 0.7;
  const hasActivity = activityGrid.some((l) => l !== "empty");

  const totalDue = topics.reduce((sum, t) => sum + t.due, 0);
  const avgMastery =
    topics.length > 0
      ? Math.round(topics.reduce((sum, t) => sum + t.mastery, 0) / topics.length)
      : 0;
  const weakestTopic =
    topics.length > 0 ? [...topics].sort((a, b) => a.mastery - b.mastery)[0] : null;

  const forecastMax = Math.max(...forecast.map((x) => x.count), 1);

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
          <DashboardSkeletonContent />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar streakDays={streakDays} reviewDue={totalDue} displayName={displayName} />
      <MobileNav />

      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8 lg:py-12">
          {isError && (
            <div className="mb-6 p-4 rounded-xl bg-again/10 border border-again/30 flex items-center justify-between gap-4">
              <p className="text-sm text-again">Could not load dashboard data.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-sm font-medium text-primary hover:underline shrink-0"
              >
                Retry
              </button>
            </div>
          )}
          {isFetching && !isLoading && (
            <div className="mb-4 text-xs text-muted-foreground flex items-center gap-2">
              <RefreshCw className="size-3 animate-spin" /> Updating…
            </div>
          )}
          <header className="mb-10">
            <p className="text-sm text-primary font-medium mb-1">{getGreeting()}, {displayName}</p>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">Daily Overview</h1>
            <p className="text-muted-foreground max-w-xl">
              {topics.length === 0 ? (
                <>
                  No topics yet.{" "}
                  <Link href="/topics/new" className="text-primary hover:underline font-medium">
                    Create your first topic
                  </Link>{" "}
                  to start reviewing.
                </>
              ) : (
                <>
                  You have <span className="text-foreground font-semibold">{totalDue} cards</span> due today across{" "}
                  {topics.filter((t) => t.due > 0).length} topics. Estimated time:{" "}
                  {Math.ceil(totalDue * minutesPerCard)} minutes.
                </>
              )}
            </p>
          </header>

          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <section className="bg-surface rounded-2xl border border-border/20 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Zap className="size-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Today&apos;s Review</h2>
                      <p className="text-sm text-muted-foreground">{totalDue} cards due</p>
                    </div>
                  </div>
                  <Link
                    href="/review"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Start Session
                    <ChevronRight className="size-4" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {topics
                    .filter((t) => t.due > 0)
                    .map((topic) => (
                      <Link
                        key={topic.slug}
                        href={`/topics/${topic.slug}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-surface-raised/50 hover:bg-surface-raised transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`size-2 rounded-full ${
                              topic.status === "at-risk"
                                ? "bg-again"
                                : topic.status === "on-track"
                                ? "bg-good"
                                : "bg-easy"
                            }`}
                          />
                          <div>
                            <p className="font-medium text-sm">{topic.name}</p>
                            <p className="text-xs text-muted-foreground">{topic.cards} cards total</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm font-semibold">{topic.due} due</p>
                            <p className="text-xs text-muted-foreground">~{Math.ceil(topic.due * minutesPerCard)}m</p>
                          </div>
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>Mastery</span>
                              <span>{topic.mastery}%</span>
                            </div>
                            <div className="h-1.5 bg-surface-dim rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  topic.mastery >= 80
                                    ? "bg-good"
                                    : topic.mastery >= 60
                                    ? "bg-hard"
                                    : "bg-again"
                                }`}
                                style={{ width: `${topic.mastery}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  {topics.filter((t) => t.due > 0).length === 0 && (
                    <p className="text-sm text-muted-foreground py-4">
                      No cards due today. Great work!{" "}
                      <Link href="/review?mode=preview" className="text-primary hover:underline">
                        Review anyway
                      </Link>
                    </p>
                  )}
                </div>
              </section>

              <section className="bg-surface rounded-2xl border border-border/20 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Active Topics</h2>
                  <Link
                    href="/topics"
                    className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    View all <ChevronRight className="size-4" />
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {topics.length === 0 && (
                    <Link
                      href="/topics/new"
                      className="sm:col-span-2 p-8 rounded-xl border border-dashed border-border/40 text-center hover:border-primary/40 transition-colors"
                    >
                      <p className="font-medium mb-1">No topics yet</p>
                      <p className="text-sm text-muted-foreground">Add your first topic to get started</p>
                    </Link>
                  )}
                  {topics.map((topic) => (
                    <Link
                      key={topic.slug}
                      href={`/topics/${topic.slug}`}
                      className="group p-5 rounded-xl bg-surface-raised/50 hover:bg-surface-raised border border-transparent hover:border-border/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-sm">{topic.name}</h3>
                        {topic.trend === "up" ? (
                          <ArrowUpRight className="size-4 text-good" />
                        ) : topic.trend === "down" ? (
                          <ArrowDownRight className="size-4 text-again" />
                        ) : (
                          <Minus className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span>{topic.cards} cards</span>
                        <span>{topic.due} due</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-dim rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              topic.mastery >= 80 ? "bg-good" : topic.mastery >= 60 ? "bg-hard" : "bg-again"
                            }`}
                            style={{ width: `${topic.mastery}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-medium min-w-[28px] text-right">{topic.mastery}%</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="bg-surface rounded-2xl border border-border/20 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="size-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Upcoming Reviews</h2>
                  </div>
                </div>
                <div className="flex items-end gap-3 h-32">
                  {forecast.map((f, i) => {
                    const height = Math.max(4, (f.count / forecastMax) * 100);
                    return (
                      <div key={`${f.day}-${i}`} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className="w-full bg-surface-raised rounded-lg relative overflow-hidden"
                          style={{ height: `${height}%` }}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-primary/60 rounded-lg"
                            style={{ height: "100%" }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">{f.day}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="lg:col-span-4 space-y-6">
              <section className="bg-surface rounded-2xl border border-border/20 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-8 rounded-lg bg-hard/10 flex items-center justify-center">
                    <TrendingUp className="size-4 text-hard" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{streakDays || 0} Days</p>
                    <p className="text-xs text-muted-foreground">Current streak</p>
                  </div>
                </div>
                {hasActivity ? (
                  <>
                    <div className="grid grid-flow-col grid-rows-7 gap-[3px] justify-start">
                      {activityGrid.map((level, i) => (
                        <div
                          key={i}
                          className={`size-[10px] rounded-[2px] ${
                            level === "high"
                              ? "bg-primary"
                              : level === "medium"
                              ? "bg-primary/50"
                              : level === "low"
                              ? "bg-primary/20"
                              : "bg-surface-raised"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-3 text-[10px] text-muted-foreground">
                      <span>90 days ago</span>
                      <span>Today</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    No reviews yet.{" "}
                    <Link href="/review" className="text-primary hover:underline">
                      Start a session
                    </Link>
                  </p>
                )}
              </section>

              <section className="bg-surface rounded-2xl border border-border/20 p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative size-36">
                    <svg className="size-36 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-raised" />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${avgMastery * 2.64} 264`}
                        className="text-primary transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{avgMastery}%</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Mastery</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {topics.slice(0, 3).map((t) => (
                    <div key={t.slug} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t.name}</span>
                      <span className="font-mono font-medium">{t.mastery}%</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-surface rounded-2xl border border-border/20 p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">AI Insight</h3>
                  </div>
                  <button
                    type="button"
                    disabled={regenerating}
                    onClick={async () => {
                      setRegenerating(true);
                      setInsightError(null);
                      try {
                        const res = await fetch("/api/ai/insights/regenerate", { method: "POST" });
                        if (!res.ok) {
                          const d = await res.json().catch(() => ({}));
                          throw new Error(d.error ?? "Failed to refresh insight");
                        }
                        await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                      } catch (e) {
                        setInsightError(e instanceof Error ? e.message : "Failed to refresh");
                      } finally {
                        setRegenerating(false);
                      }
                    }}
                    className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`size-3.5 ${regenerating ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
                {insightError && (
                  <p className="text-xs text-again mb-2">{insightError}</p>
                )}
                <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
              </section>

              <section className="bg-surface rounded-2xl border border-border/20 p-6">
                <h3 className="text-sm font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    href="/topics/new"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-raised transition-colors text-sm"
                  >
                    <BookOpen className="size-4 text-muted-foreground" />
                    Add new topic
                  </Link>
                  <Link
                    href={
                      weakestTopic
                        ? `/quiz?topic=${encodeURIComponent(weakestTopic.slug)}&count=5`
                        : "/quiz"
                    }
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-raised transition-colors text-sm"
                  >
                    <BrainCircuit className="size-4 text-muted-foreground" />
                    Start a quiz
                  </Link>
                  <Link
                    href={
                      weakestTopic
                        ? `/mock/new?topic=${encodeURIComponent(weakestTopic.name)}`
                        : "/mock/new"
                    }
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-raised transition-colors text-sm"
                  >
                    <Calendar className="size-4 text-muted-foreground" />
                    Start a mock test
                  </Link>
                  <Link
                    href="/tutor"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-raised transition-colors text-sm"
                  >
                    <TrendingUp className="size-4 text-muted-foreground" />
                    Ask AI tutor
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
