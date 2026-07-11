"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  RefreshCw,
  Minus,
  BrainCircuit,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { DashboardKpiStrip } from "@/components/dashboard/DashboardKpiStrip";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import {
  ChartsRowSkeleton,
  InsightSkeleton,
  KpiStripSkeleton,
  QuickActionsSkeleton,
  ReviewSectionSkeleton,
  StreakSkeleton,
  TopicsListSkeleton,
} from "@/components/dashboard/DashboardSkeleton";
import type { ActivityLevel, DashboardTopic, WeeklyActivityDay } from "@/lib/data/dashboard";

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

function TrendIcon({ trend }: { trend: DashboardTopic["trend"] }) {
  if (trend === "up") return <ArrowUpRight className="size-4 text-good shrink-0" />;
  if (trend === "down") return <ArrowDownRight className="size-4 text-again shrink-0" />;
  return <Minus className="size-4 text-muted-foreground shrink-0" />;
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
        weeklyActivity: WeeklyActivityDay[];
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
  const weeklyActivity = decksQuery.data?.weeklyActivity ?? [];
  const insight = insightQuery.data?.insight ?? "";

  const hasActivity = activityGrid.some((l) => l !== "empty");
  const avgMastery =
    topics.length > 0
      ? Math.round(topics.reduce((sum, t) => sum + t.mastery, 0) / topics.length)
      : 0;
  const reviews7d = weeklyActivity.reduce((sum, d) => sum + d.cards, 0);
  const weakestTopic =
    topics.length > 0 ? [...topics].sort((a, b) => a.mastery - b.mastery)[0] : null;
  const dueTopics = topics.filter((t) => t.due > 0);
  const isLoadingTop = summaryQuery.isLoading || decksQuery.isLoading;
  const hasLoadError = summaryQuery.isError || decksQuery.isError;
  const loadErrorMessage =
    (summaryQuery.error as Error | undefined)?.message ??
    (decksQuery.error as Error | undefined)?.message ??
    "Failed to load dashboard";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar streakDays={streakDays} reviewDue={totalDue} displayName={displayName} />
      <MobileNav streakDays={streakDays} />

      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8 lg:py-12">
          {hasLoadError && (
            <div className="mb-6 rounded-xl border border-again/30 bg-again/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-again">{loadErrorMessage}</p>
              <button
                type="button"
                onClick={() => {
                  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                }}
                className="text-sm font-medium text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          )}
          <header className="mb-8">
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
                  {dueTopics.length} topics. Estimated time: {Math.ceil(totalDue * minutesPerCard)} minutes.
                </>
              )}
            </p>
          </header>

          {isLoadingTop ? (
            <KpiStripSkeleton />
          ) : (
            <DashboardKpiStrip
              dueToday={totalDue}
              streakDays={streakDays}
              avgMastery={avgMastery}
              reviews7d={reviews7d}
            />
          )}

          {isLoadingTop ? (
            <QuickActionsSkeleton />
          ) : (
            <DashboardQuickActions
              weakestTopicSlug={weakestTopic?.slug ?? null}
              weakestTopicName={weakestTopic?.name ?? null}
            />
          )}

          {decksQuery.isLoading ? (
            <ChartsRowSkeleton />
          ) : (
            <DashboardCharts weeklyActivity={weeklyActivity} forecast={forecast} topics={topics} />
          )}

          <div className="grid lg:grid-cols-12 gap-10 pt-8">
            <div className="lg:col-span-8 space-y-10">
              {decksQuery.isLoading ? (
                <ReviewSectionSkeleton />
              ) : (
                <DashboardSection
                  title="Today's review"
                  description={`${totalDue} cards due`}
                  action={{ label: "Start session", href: "/review" }}
                >
                  <div className="divide-y divide-border/20">
                    {dueTopics.map((topic) => (
                      <Link
                        key={topic.slug}
                        href={`/topics/${topic.slug}`}
                        className="flex items-center justify-between py-3 gap-4 hover:bg-surface-raised/50 -mx-2 px-2 rounded-lg transition-colors first:pt-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`size-2 rounded-full shrink-0 ${
                              topic.status === "at-risk"
                                ? "bg-again"
                                : topic.status === "on-track"
                                ? "bg-good"
                                : "bg-easy"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{topic.name}</p>
                            <p className="text-xs text-muted-foreground">{topic.cards} cards total</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-5 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold">{topic.due} due</p>
                            <p className="text-xs text-muted-foreground">
                              ~{Math.ceil(topic.due * minutesPerCard)}m
                            </p>
                          </div>
                          <div className="w-20 hidden sm:block">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>Mastery</span>
                              <span>{topic.mastery}%</span>
                            </div>
                            <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
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
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                    {dueTopics.length === 0 && (
                      <p className="text-sm text-muted-foreground py-3">
                        No cards due today. Great work!{" "}
                        <Link href="/review?mode=preview" className="text-primary hover:underline">
                          Review anyway
                        </Link>
                      </p>
                    )}
                  </div>
                </DashboardSection>
              )}

              {decksQuery.isLoading ? (
                <TopicsListSkeleton />
              ) : (
                <DashboardSection title="Active topics" action={{ label: "View all", href: "/topics" }}>
                  {topics.length === 0 ? (
                    <Link
                      href="/topics/new"
                      className="block py-8 text-center text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <p className="font-medium text-foreground mb-1">No topics yet</p>
                      <p>Add your first topic to get started</p>
                    </Link>
                  ) : (
                    <div className="divide-y divide-border/20">
                      {topics.map((topic) => (
                        <Link
                          key={topic.slug}
                          href={`/topics/${topic.slug}`}
                          className="flex items-center gap-4 py-3 hover:bg-surface-raised/50 -mx-2 px-2 rounded-lg transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm truncate">{topic.name}</p>
                              <TrendIcon trend={topic.trend} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {topic.cards} cards · {topic.due} due
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 w-28 sm:w-36">
                            <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  topic.mastery >= 80 ? "bg-good" : topic.mastery >= 60 ? "bg-hard" : "bg-again"
                                }`}
                                style={{ width: `${topic.mastery}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-medium w-8 text-right">{topic.mastery}%</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </DashboardSection>
              )}
            </div>

            <aside className="lg:col-span-4 space-y-10 divide-y lg:divide-y-0 lg:divide-none divide-border/30">
              {summaryQuery.isLoading ? (
                <StreakSkeleton />
              ) : (
                <DashboardSection title="Review streak" description="Last 90 days">
                  <div className="flex items-baseline gap-2 mb-4">
                    <p className="text-3xl font-bold tabular-nums">{streakDays}</p>
                    <p className="text-sm text-muted-foreground">{streakDays === 1 ? "day" : "days"}</p>
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
                    <p className="text-sm text-muted-foreground">
                      No reviews yet.{" "}
                      <Link href="/review" className="text-primary hover:underline">
                        Start a session
                      </Link>
                    </p>
                  )}
                </DashboardSection>
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
    <div className="pt-10 lg:pt-0 border-t lg:border-t-0 border-border/30">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI insight</h3>
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
    </div>
  );
}
