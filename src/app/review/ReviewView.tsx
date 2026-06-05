"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RotateCcw,
  Keyboard,
  Trophy,
  X,
  Clock,
  Zap,
  ChevronRight,
  AlertCircle,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import type { ReviewQueueCard, ReviewQueueMeta } from "@/lib/review/get-review-queue";
import { MINUTES_PER_CARD } from "@/lib/review/constants";
import { intervalLabelForRating } from "@/lib/srs/format-interval";
import type { ReviewRating } from "@/lib/srs/update-scheduling";

type Step = "setup" | "active" | "complete";

type TopicOption = { slug: string; name: string; due: number; status?: string };

const SESSION_SIZES = [10, 20, 50] as const;

const RATING_BUTTONS: { key: ReviewRating; label: string; color: string; hover: string }[] = [
  { key: "again", label: "Again", color: "bg-again", hover: "hover:bg-again/90" },
  { key: "hard", label: "Hard", color: "bg-hard", hover: "hover:bg-hard/90" },
  { key: "good", label: "Good", color: "bg-good", hover: "hover:bg-good/90" },
  { key: "easy", label: "Easy", color: "bg-easy", hover: "hover:bg-easy/90" },
];

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function ReviewSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-6 lg:py-10 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-surface-raised rounded" />
          <div className="h-3 w-20 bg-surface-raised rounded" />
        </div>
        <div className="h-4 w-16 bg-surface-raised rounded" />
      </div>
      <div className="h-1 bg-surface-raised rounded-full mb-8" />
      <div className="min-h-[280px] bg-surface rounded-2xl border border-border/20 p-8 lg:p-10">
        <div className="h-3 w-24 bg-surface-raised rounded mb-6" />
        <div className="space-y-3">
          <div className="h-5 w-full bg-surface-raised rounded" />
          <div className="h-5 w-4/5 bg-surface-raised rounded" />
          <div className="h-5 w-3/5 bg-surface-raised rounded" />
        </div>
        <div className="mt-8 h-24 bg-surface-raised rounded-xl" />
      </div>
      <div className="grid grid-cols-4 gap-3 mt-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface-raised rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function SetupSkeleton() {
  return (
    <div className="max-w-xl mx-auto px-6 py-12 animate-pulse space-y-6">
      <div className="h-8 w-48 bg-surface-raised rounded mx-auto" />
      <div className="h-4 w-64 bg-surface-raised rounded mx-auto" />
      <div className="rounded-2xl border border-border/20 bg-surface p-6 space-y-4">
        <div className="h-16 bg-surface-raised rounded-xl" />
        <div className="h-12 bg-surface-raised rounded-xl" />
        <div className="h-12 bg-surface-raised rounded-xl" />
      </div>
      <div className="h-12 bg-surface-raised rounded-xl" />
    </div>
  );
}

function ReviewViewInner() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialMode = searchParams.get("mode") === "preview" ? "preview" : "due";
  const initialTopic = searchParams.get("topic") ?? "";

  const [step, setStep] = useState<Step>("setup");
  const [sessionMode, setSessionMode] = useState<"due" | "preview">(initialMode);
  const [sessionLimit, setSessionLimit] = useState<number>(20);
  const [topicFilter, setTopicFilter] = useState(initialTopic);
  const [cards, setCards] = useState<ReviewQueueCard[]>([]);
  const [meta, setMeta] = useState<ReviewQueueMeta | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingInFlight, setRatingInFlight] = useState(false);
  const [results, setResults] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [remainingDue, setRemainingDue] = useState(0);

  const sessionStart = useRef<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const statsQuery = useQuery({
    queryKey: ["review-stats", topicFilter || "all"],
    queryFn: () =>
      fetchJson<{ totalDue: number }>(
        `/api/me/review/stats${topicFilter ? `?topic=${encodeURIComponent(topicFilter)}` : ""}`
      ),
  });

  const topicsQuery = useQuery({
    queryKey: ["topics"],
    queryFn: () => fetchJson<{ topics: TopicOption[] }>("/api/me/topics"),
  });

  const topicOptions = useMemo(
    () =>
      (topicsQuery.data?.topics ?? [])
        .filter((t) => t.status !== "archived")
        .map((t) => ({ slug: t.slug, name: t.name, due: t.due })),
    [topicsQuery.data]
  );

  const topicBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cards) {
      map.set(c.topic, (map.get(c.topic) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [cards]);

  useEffect(() => {
    if (step !== "active") return;
    const t = setInterval(() => {
      if (sessionStart.current) {
        setElapsedSec(Math.floor((Date.now() - sessionStart.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    if (step !== "active") return;
    const onKey = (e: KeyboardEvent) => {
      if (ratingInFlight) return;
      if (e.key === " " && !flipped && e.target === document.body) {
        e.preventDefault();
        setFlipped(true);
      }
      if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        const ratings: ReviewRating[] = ["again", "hard", "good", "easy"];
        const r = ratings[Number(e.key) - 1];
        void handleRate(r);
      }
      if (e.key === "Escape" && step === "active") {
        if (window.confirm("Exit review session? Progress on the current card is not saved.")) {
          setStep("setup");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, flipped, ratingInFlight, index, cards]);

  const invalidateAfterReview = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["schedule-summary"] });
    void queryClient.invalidateQueries({ queryKey: ["review-stats"] });
    void queryClient.invalidateQueries({ queryKey: ["topics"] });
  }, [queryClient]);

  const startSession = async (mode: "due" | "preview") => {
    setSessionLoading(true);
    setSessionError(null);
    setSessionMode(mode);
    try {
      const params = new URLSearchParams({
        limit: String(sessionLimit),
        mode,
      });
      if (topicFilter) params.set("topic", topicFilter);
      const data = await fetchJson<{ cards: ReviewQueueCard[]; meta: ReviewQueueMeta }>(
        `/api/me/review/queue?${params}`
      );
      if (!data.cards.length) {
        setSessionError(
          mode === "preview"
            ? "No upcoming cards available. Add topics and cards to study ahead."
            : "No cards due right now. Try study ahead or check back later."
        );
        return;
      }
      setCards(data.cards);
      setMeta(data.meta);
      setIndex(0);
      setFlipped(false);
      setTextAnswer("");
      setRatingError(null);
      setResults({ again: 0, hard: 0, good: 0, easy: 0 });
      sessionStart.current = Date.now();
      setElapsedSec(0);
      setStep("active");
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : "Failed to start session");
    } finally {
      setSessionLoading(false);
    }
  };

  const handleRate = async (r: ReviewRating) => {
    const card = cards[index];
    if (!card || ratingInFlight) return;

    setRatingInFlight(true);
    setRatingError(null);
    try {
      const res = await fetch("/api/me/review/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, rating: r }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Failed to save rating");
      }
      setResults((prev) => ({ ...prev, [r]: prev[r] + 1 }));
      if (index < cards.length - 1) {
        setIndex((i) => i + 1);
        setFlipped(false);
        setTextAnswer("");
      } else {
        const stats = await fetchJson<{ totalDue: number }>("/api/me/review/stats");
        setRemainingDue(Math.max(0, stats.totalDue));
        setStep("complete");
        invalidateAfterReview();
      }
    } catch (e) {
      setRatingError(e instanceof Error ? e.message : "Failed to save rating");
    } finally {
      setRatingInFlight(false);
    }
  };

  const handleSkip = () => {
    if (index >= cards.length - 1) return;
    setCards((prev) => {
      const next = [...prev];
      const [skipped] = next.splice(index, 1);
      next.push(skipped);
      return next;
    });
    setFlipped(false);
    setTextAnswer("");
    setRatingError(null);
  };

  const card = cards[index];
  const progress = cards.length ? ((index + (flipped ? 1 : 0)) / cards.length) * 100 : 0;
  const totalDue = statsQuery.data?.totalDue ?? 0;
  const estimatedMinutes = Math.max(1, Math.ceil(Math.min(sessionLimit, totalDue || sessionLimit) * MINUTES_PER_CARD));
  const minutesLeft = Math.max(0, Math.ceil((cards.length - index) * MINUTES_PER_CARD));

  const layout = (content: React.ReactNode) => (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">{content}</main>
    </div>
  );

  if (statsQuery.isLoading && step === "setup") {
    return layout(<SetupSkeleton />);
  }

  if (statsQuery.isError && step === "setup") {
    return layout(
      <div className="flex items-center justify-center min-h-[50vh] px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-again">Could not load review stats</h1>
          <p className="text-sm text-muted-foreground mt-2">{statsQuery.error.message}</p>
          <button
            type="button"
            onClick={() => void statsQuery.refetch()}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (step === "setup") {
    return layout(
      <div className="max-w-xl mx-auto px-6 py-10 lg:py-16">
        <div className="text-center mb-8">
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Review Session</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {totalDue > 0
              ? `${totalDue} card${totalDue !== 1 ? "s" : ""} due across your active topics`
              : "You're caught up — study ahead or add more cards"}
          </p>
        </div>

        <div className="rounded-2xl border border-border/20 bg-surface p-5 sm:p-6 space-y-5 mb-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-surface-raised">
              <p className="text-2xl font-bold tabular-nums">{totalDue}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Due</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-raised">
              <p className="text-2xl font-bold tabular-nums">{sessionLimit}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">This session</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-raised">
              <p className="text-2xl font-bold tabular-nums">~{estimatedMinutes}m</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Est. time</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Session size
            </label>
            <div className="mt-2 flex gap-2">
              {SESSION_SIZES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSessionLimit(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    sessionLimit === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n} cards
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Topic filter
            </label>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="mt-2 w-full h-10 px-3 bg-surface-raised rounded-lg border border-border/20 text-sm focus:outline-none focus:border-primary/40"
            >
              <option value="">All topics</option>
              {topicOptions.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name} ({t.due} due)
                </option>
              ))}
            </select>
          </div>
        </div>

        {sessionError && (
          <div className="mb-4 p-3 rounded-xl bg-again/10 border border-again/30 text-sm text-again flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            {sessionError}
          </div>
        )}

        <div className="space-y-3">
          {totalDue > 0 ? (
            <button
              type="button"
              disabled={sessionLoading}
              onClick={() => void startSession("due")}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {sessionLoading && sessionMode === "due" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              Start review ({Math.min(sessionLimit, totalDue)} due)
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <div className="text-center p-4 rounded-xl bg-good/10 border border-good/20 text-sm mb-2">
              All caught up! Study ahead with upcoming cards.
            </div>
          )}
          <button
            type="button"
            disabled={sessionLoading}
            onClick={() => void startSession("preview")}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-border/50 rounded-xl font-medium hover:bg-surface-raised transition-colors disabled:opacity-50"
          >
            {sessionLoading && sessionMode === "preview" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BookOpen className="size-4" />
            )}
            Study ahead
          </button>
          <Link
            href="/topics/new"
            className="block text-center text-sm text-muted-foreground hover:text-primary"
          >
            Add a new topic
          </Link>
        </div>
      </div>
    );
  }

  if (step === "complete") {
    const total = cards.length;
    const correct = results.good + results.easy;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    const sessionMinutes = Math.max(1, Math.round(elapsedSec / 60) || 1);
    const quizTopicSlug =
      topicFilter || cards[cards.length - 1]?.topicSlug || topicOptions[0]?.slug || "";

    return layout(
      <div className="max-w-2xl mx-auto px-6 py-12 lg:py-20">
        <div className="bg-surface rounded-2xl border border-border/20 p-8 lg:p-12 text-center">
          <div className="size-16 rounded-2xl bg-good/10 flex items-center justify-center mx-auto mb-6">
            <Trophy className="size-8 text-good" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Session Complete</h1>
          <p className="text-muted-foreground mb-2">
            You reviewed {total} cards in {sessionMinutes} minute{sessionMinutes !== 1 ? "s" : ""}.
          </p>
          {remainingDue > 0 && (
            <p className="text-sm text-primary mb-6">
              {remainingDue} card{remainingDue !== 1 ? "s" : ""} still due — keep going!
            </p>
          )}

          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-surface-raised">
              <p className="text-2xl font-bold text-again">{results.again}</p>
              <p className="text-xs text-muted-foreground mt-1">Again</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-raised">
              <p className="text-2xl font-bold text-hard">{results.hard}</p>
              <p className="text-xs text-muted-foreground mt-1">Hard</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-raised">
              <p className="text-2xl font-bold text-good">{results.good}</p>
              <p className="text-xs text-muted-foreground mt-1">Good</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-raised">
              <p className="text-2xl font-bold text-easy">{results.easy}</p>
              <p className="text-xs text-muted-foreground mt-1">Easy</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm mb-8">
            <span className="text-muted-foreground">Accuracy:</span>
            <span className="font-bold text-lg">{accuracy}%</span>
          </div>

          {topicBreakdown.length > 0 && (
            <div className="text-left mb-8 p-4 rounded-xl bg-surface-raised">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Topics reviewed
              </p>
              <div className="space-y-1">
                {topicBreakdown.map(([name, count]) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span>{name}</span>
                    <span className="text-muted-foreground tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {remainingDue > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStep("setup");
                  void statsQuery.refetch();
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Continue reviewing
              </button>
            )}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 border border-border/50 rounded-xl font-medium hover:bg-surface-raised transition-colors"
            >
              Back to Dashboard
            </Link>
            <Link
              href={quizTopicSlug ? `/quiz?topic=${encodeURIComponent(quizTopicSlug)}&count=5` : "/quiz"}
              className="inline-flex items-center gap-2 px-6 py-3 border border-border/50 rounded-xl font-medium hover:bg-surface-raised transition-colors"
            >
              Take a Quiz
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (sessionLoading || !card) {
    return layout(<ReviewSkeleton />);
  }

  const fmtElapsed = `${Math.floor(elapsedSec / 60)}:${(elapsedSec % 60).toString().padStart(2, "0")}`;

  return layout(
    <div className="max-w-3xl mx-auto px-6 py-6 lg:py-10 pb-28 lg:pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Exit review session? Progress on the current card is not saved.")) {
                setStep("setup");
              }
            }}
            className="size-9 flex items-center justify-center rounded-lg hover:bg-surface-raised transition-colors"
          >
            <X className="size-5" />
          </button>
          <div>
            <p className="text-sm font-medium">Review Session</p>
            <p className="text-xs text-muted-foreground">
              Card {index + 1} of {cards.length}
              {meta?.mode === "preview" && " · Study ahead"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="hidden sm:inline tabular-nums">{fmtElapsed}</span>
          <Clock className="size-3.5" />
          <span>~{minutesLeft}m left</span>
        </div>
      </div>

      <div className="h-1 bg-surface-raised rounded-full overflow-hidden mb-8">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {ratingError && (
        <div className="mb-4 p-3 rounded-xl bg-again/10 border border-again/30 text-sm flex items-center justify-between gap-3">
          <span className="text-again flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {ratingError}
          </span>
          <button
            type="button"
            onClick={() => setRatingError(null)}
            className="text-xs text-primary hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="relative mb-8">
        <div
          className={`min-h-[280px] bg-surface rounded-2xl border border-border/20 p-8 lg:p-10 flex flex-col cursor-pointer transition-all ${
            flipped ? "border-primary/20" : "hover:border-border/40"
          }`}
          onClick={() => !flipped && setFlipped(true)}
        >
          {!flipped ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  {card.topicSlug ? (
                    <Link
                      href={`/topics/${card.topicSlug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-medium text-primary uppercase tracking-wider hover:underline"
                    >
                      {card.topic}
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-primary uppercase tracking-wider">
                      {card.topic}
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-raised text-muted-foreground tabular-nums">
                    {card.mastery}% mastery
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Tap or Space to reveal</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-medium leading-relaxed flex-1">{card.question}</h2>

              <div className="mt-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <Keyboard className="size-3.5" />
                  Type your answer (optional) · 1–4 to rate when revealed
                </div>
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Type your answer before revealing..."
                  className="w-full h-24 bg-surface-raised rounded-xl border border-border/20 px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/50"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-medium text-primary uppercase tracking-wider">{card.topic}</span>
                <div className="flex items-center gap-2">
                  {index < cards.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSkip();
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Skip for now
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFlipped(false);
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="size-3" />
                    Hide
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-lg leading-relaxed mb-4">{card.answer}</p>
                {textAnswer && (
                  <div className="mt-4 pt-4 border-t border-border/20">
                    <p className="text-xs text-muted-foreground mb-2">Your answer:</p>
                    <p className="text-sm text-muted-foreground italic">{textAnswer}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {flipped && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 fixed bottom-16 left-0 right-0 px-4 py-3 bg-background/95 backdrop-blur border-t border-border/30 lg:static lg:bg-transparent lg:backdrop-blur-none lg:border-0 lg:p-0 z-40">
          {RATING_BUTTONS.map((btn, i) => (
            <button
              key={btn.key}
              type="button"
              disabled={ratingInFlight}
              onClick={() => void handleRate(btn.key)}
              className={`flex flex-col items-center gap-1 p-3 sm:p-4 rounded-xl ${btn.color} ${btn.hover} text-white transition-all active:scale-[0.97] disabled:opacity-50`}
            >
              {ratingInFlight ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <span className="font-semibold text-sm">{btn.label}</span>
                  <span className="text-xs opacity-70">
                    {intervalLabelForRating(btn.key)} · {i + 1}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewView() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <SetupSkeleton />
      </div>
    }>
      <ReviewViewInner />
    </Suspense>
  );
}
