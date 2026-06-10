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
import {
  ForecastSkeleton,
  InsightSkeleton,
  MasterySkeleton,
  ReviewSectionSkeleton,
  StreakSkeleton,
  TopicsGridSkeleton,
} from "@/components/dashboard/DashboardSkeleton";
import type { ActivityLevel, DashboardTopic } from "@/lib/data/dashboard";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

type SummaryPayload = {
  displayName: string;
  totalDue: number;
  streakDays: number;
  activityGrid: ActivityLevel[];
  totalReviewsInPeriod: number;
  minutesPerCard: number;
};

function activityLevelClass(level: ActivityLevel): string {
  if (level === "high") return "bg-primary";
  if (level === "medium") return "bg-primary/50";
  if (level === "low") return "bg-primary/20";
  return "bg-surface-raised";
}

export function DashboardView() {
  const queryClient = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => fetchJson<SummaryPayload>("/api/me/dashboard/summary"),
  });

  const decksQuery = useQuery({
    queryKey: ["dashboard", "decks"],
    queryFn: () =>
      fetchJson<{
        topics: DashboardTopic[];
        forecast: { day: string; count: number }[];
      }>("/api/me/dashboard/decks"),
  });

  const insightQuery = useQuery({
    queryKey: ["dashboard", "insight"],
    queryFn: () => fetchJson<{ insight: string }>("/api/me/dashboard/insight"),
  });

  const displayName = summaryQuery.data?.displayName ?? "there";
  const totalDue = summaryQuery.data?.totalDue ?? 0;
  const streakDays = summaryQuery.data?.streakDays ?? 0;
  const minutesPerCard = summaryQuery.data?.minutesPerCard ?? 0.7;
  const activityGrid = summaryQuery.data?.activityGrid ?? [];
  const totalReviewsInPeriod = summaryQuery.data?.totalReviewsInPeriod ?? 0;
  const topics = decksQuery.data?.topics ?? [];
  const forecast = decksQuery.data?.forecast ?? [];
  const insight = insightQuery.data?.insight ?? "";

  const hasActivity = activityGrid.some((l) => l !== "empty");
  const avgMastery =
    topics.length > 0
      ? Math.round(topics.reduce((sum, t) => sum + t.mastery, 0) / topics.length)
      : 0;
  const weakestTopic =
    topics.length > 0 ? [...topics].sort((a, b) => a.mastery - b.mastery)[0] : null;
  const forecastMax = Math.max(...forecast.map((x) => x.count), 1);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar streakDays={streakDays} reviewDue={totalDue} displayName={displayName} />
      <MobileNav streakDays={streakDays} />

      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8 lg:py-12">
          <header className="mb-10">
            <p className="text-sm text-primary font-medium mb-1">
              {getGreeting()}, {summaryQuery.isLoading ? "…" : displayName}
            </p>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">Daily Overview</h1>
            <p className="text-muted-foreground max-w-xl">
              {decksQuery.isLoading ? (
                <span className="inline-block h-4 w-72 bg-surface-raised rounded animate-pulse" />
              ) : topics.length === 0 ? (
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
              {decksQuery.isLoading ? (
                <ReviewSectionSkeleton />
              ) : (
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
              )}

              {decksQuery.isLoading ? (
                <TopicsGridSkeleton />
              ) : (
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
              )}

              {decksQuery.isLoading ? (
                <ForecastSkeleton />
              ) : (
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
              )}
            </div>

            <aside className="lg:col-span-4 space-y-6">
              {summaryQuery.isLoading ? (
                <StreakSkeleton />
              ) : (
                <section className="bg-surface rounded-2xl border border-border/20 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-8 rounded-lg bg-hard/10 flex items-center justify-center">
                      <TrendingUp className="size-4 text-hard" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {streakDays} {streakDays === 1 ? "day" : "days"} streak
                      </p>
                      <p className="text-xs text-muted-foreground">Consecutive review days</p>
                    </div>
                  </div>
                  {hasActivity ? (
                    <>
                      <div className="w-full grid grid-flow-col grid-rows-7 auto-cols-fr gap-1">
                        {activityGrid.map((level, i) => (
                          <div
                            key={i}
                            className={`aspect-square w-full min-w-0 rounded-[3px] ${activityLevelClass(level)}`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between mt-3 text-[10px] text-muted-foreground">
                        <span>90 days ago</span>
                        <span>{totalReviewsInPeriod} reviews</span>
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
              )}

              {decksQuery.isLoading ? (
                <MasterySkeleton />
              ) : (
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
              )}

              {insightQuery.isLoading ? (
                <InsightSkeleton />
              ) : (
                <DashboardInsightCard
                  insight={insight}
                  onRegenerated={() => {
                    void queryClient.invalidateQueries({ queryKey: ["dashboard", "insight"] });
                  }}
                />
              )}

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

function DashboardInsightCard({
  insight,
  onRegenerated,
}: {
  insight: string;
  onRegenerated: () => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  return (
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
              onRegenerated();
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
      {insightError && <p className="text-xs text-again mb-2">{insightError}</p>}
      <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
    </section>
  );
}
