"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BrainCircuit,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Trophy,
  Target,
  Clock,
  ArrowRight,
  RotateCcw,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { MINUTES_PER_CARD } from "@/lib/review/constants";
import { saveLastQuizSession } from "@/lib/tutor/quiz-storage";

type QuizQuestion = {
  id: number;
  type: "mcq";
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

type TopicOption = {
  id: string;
  slug: string;
  name: string;
  mastery: number;
  cards: number;
  status: string;
};

type Step = "setup" | "generating" | "active" | "done" | "error";

function QuizSetupSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 animate-pulse">
      <div className="bg-surface rounded-2xl border border-border/20 p-8 space-y-4">
        <div className="size-12 bg-surface-raised rounded-xl" />
        <div className="h-8 w-48 bg-surface-raised rounded" />
        <div className="h-20 bg-surface-raised rounded-xl" />
        <div className="h-12 bg-surface-raised rounded-xl" />
        <div className="h-12 bg-primary/20 rounded-xl" />
      </div>
    </div>
  );
}

function QuizGeneratingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 animate-pulse">
      <Loader2 className="size-10 text-primary animate-spin mb-4" />
      <p className="text-sm font-medium">Building your quiz…</p>
      <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
    </div>
  );
}

function QuizQuestionSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 animate-pulse space-y-6">
      <div className="h-4 w-40 bg-surface-raised rounded" />
      <div className="h-1.5 bg-surface-raised rounded-full" />
      <div className="bg-surface rounded-2xl border border-border/20 p-8 space-y-3">
        <div className="h-6 w-full bg-surface-raised rounded" />
        <div className="h-6 w-4/5 bg-surface-raised rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-surface-raised rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function QuizViewInner() {
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get("topic") ?? "";
  const initialCount = Number(searchParams.get("count")) || 10;

  const [step, setStep] = useState<Step>("setup");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [questionCount, setQuestionCount] = useState(
    [5, 10, 15, 20].includes(initialCount) ? initialCount : 10
  );
  const [topicSlug, setTopicSlug] = useState("");

  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<{ q: number; correct: boolean; selected: number | null }[]>([]);

  const topicsQuery = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const r = await fetch("/api/me/topics");
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) {
        throw new Error((d as { error?: string }).error ?? "Session expired — please sign in again");
      }
      if (!r.ok) throw new Error((d as { error?: string }).error ?? "Failed to load topics");
      return (d.topics ?? []) as TopicOption[];
    },
  });

  const activeTopics = (topicsQuery.data ?? []).filter(
    (t) => t.status !== "archived" && t.cards > 0
  );

  useEffect(() => {
    if (!selectedSlug && activeTopics.length > 0) {
      const weakest = [...activeTopics].sort((a, b) => a.mastery - b.mastery)[0];
      setSelectedSlug(weakest.slug ?? weakest.id);
    }
  }, [activeTopics, selectedSlug]);

  const startQuiz = useCallback(async () => {
    if (!selectedSlug) return;
    setStep("generating");
    setQuizError(null);
    try {
      const res = await fetch("/api/ai/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicSlug: selectedSlug, count: questionCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quiz generation failed");
      if (!data.questions?.length) throw new Error("No questions were generated");
      setTopicSlug(data.topic?.slug ?? selectedSlug);
      setQuizQuestions(
        data.questions.map(
          (
            q: { prompt: string; options: string[]; correct: number; explanation: string },
            i: number
          ) => ({
            id: i + 1,
            type: "mcq" as const,
            question: q.prompt,
            options: q.options,
            correct: q.correct,
            explanation: q.explanation,
          })
        )
      );
      setQIndex(0);
      setScore(0);
      setResults([]);
      setAnswered(false);
      setSelected(null);
      setStep("active");
    } catch (e) {
      setQuizError(e instanceof Error ? e.message : "Quiz generation failed");
      setStep("error");
    }
  }, [selectedSlug, questionCount]);

  const handleAnswer = () => {
    const question = quizQuestions[qIndex];
    if (answered || !question) return;
    const correct = selected === question.correct;
    if (correct) setScore((s) => s + 1);
    setResults((r) => [...r, { q: question.id, correct, selected }]);
    setAnswered(true);
  };

  const nextQuestion = () => {
    if (qIndex < quizQuestions.length - 1) {
      setQIndex((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setStep("done");
    }
  };

  useEffect(() => {
    if (step !== "done" || quizQuestions.length === 0) return;

    const slug = topicSlug || selectedSlug;
    const mistakes = quizQuestions
      .map((q) => {
        const result = results.find((r) => r.q === q.id);
        if (result?.correct) return null;
        return {
          question: q.question,
          options: q.options,
          selectedIndex: result?.selected ?? null,
          correctIndex: q.correct,
          explanation: q.explanation,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    saveLastQuizSession({
      topicSlug: slug,
      topicName: activeTopics.find((t) => (t.slug ?? t.id) === slug)?.name ?? slug,
      score,
      total: quizQuestions.length,
      completedAt: new Date().toISOString(),
      mistakes,
    });
  }, [step, quizQuestions, results, score, topicSlug, selectedSlug, activeTopics]);

  useEffect(() => {
    if (step !== "active") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (!answered && ["1", "2", "3", "4"].includes(e.key)) {
        setSelected(Number(e.key) - 1);
      }
      if (e.key === "Enter") {
        if (!answered && selected !== null) handleAnswer();
        else if (answered) nextQuestion();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, answered, selected, qIndex, quizQuestions.length]);

  const layout = (content: React.ReactNode) => (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">{content}</main>
    </div>
  );

  if (step === "error") {
    return layout(
      <div className="flex items-center justify-center min-h-[50vh] px-6">
        <div className="text-center max-w-md">
          <AlertCircle className="size-10 text-again mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-again">Could not start quiz</h1>
          <p className="text-sm text-muted-foreground mt-2">{quizError}</p>
          <button
            type="button"
            onClick={() => { setStep("setup"); setQuizError(null); }}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Back to setup
          </button>
        </div>
      </div>
    );
  }

  if (step === "generating") {
    return layout(<QuizGeneratingSkeleton />);
  }

  if (step === "setup") {
    if (topicsQuery.isLoading) {
      return layout(<QuizSetupSkeleton />);
    }

    return layout(
      <div className="max-w-2xl mx-auto px-6 py-12 lg:py-20">
        <div className="bg-surface rounded-2xl border border-border/20 p-8 lg:p-10">
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
            <BrainCircuit className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Quiz Session</h1>
          <p className="text-muted-foreground mb-8">Test your understanding with AI-generated MCQs from your flashcards.</p>

          {topicsQuery.isError && (
            <div className="mb-4 p-3 rounded-xl bg-again/10 border border-again/30 text-sm text-again flex flex-col sm:flex-row justify-between gap-2">
              <span>{topicsQuery.error.message}</span>
              <div className="flex items-center gap-3 shrink-0">
                {topicsQuery.error.message.toLowerCase().includes("session") ||
                topicsQuery.error.message.toLowerCase().includes("unauthorized") ? (
                  <Link href="/login?next=/quiz" className="text-primary hover:underline">
                    Sign in
                  </Link>
                ) : null}
                <button type="button" onClick={() => void topicsQuery.refetch()} className="text-primary hover:underline">
                  Retry
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-8">
            <div className="p-4 rounded-xl bg-surface-raised">
              <div className="flex items-center gap-3 mb-2">
                <Target className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">Topic</span>
              </div>
              {activeTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No topics with cards yet.{" "}
                  <Link href="/topics/new" className="text-primary hover:underline">Create one</Link>
                </p>
              ) : (
                <select
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="w-full h-10 px-3 bg-surface rounded-lg border border-border/20 text-sm focus:outline-none focus:border-primary/40"
                >
                  {activeTopics.map((t) => (
                    <option key={t.slug ?? t.id} value={t.slug ?? t.id}>
                      {t.name} ({t.mastery}% · {t.cards} cards)
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="p-4 rounded-xl bg-surface-raised flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrainCircuit className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">Questions</span>
              </div>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="h-9 px-3 bg-surface rounded-lg border border-border/20 text-sm"
              >
                {[5, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>{n} questions</option>
                ))}
              </select>
            </div>
            <div className="p-4 rounded-xl bg-surface-raised flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">Estimated time</span>
              </div>
              <span className="text-sm text-muted-foreground">
                ~{Math.max(1, Math.ceil(questionCount * MINUTES_PER_CARD))} min
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void startQuiz()}
            disabled={activeTopics.length === 0 || !selectedSlug}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            Start Quiz
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  if (step === "done") {
    const accuracy = Math.round((score / quizQuestions.length) * 100);
    const slug = topicSlug || selectedSlug;
    return layout(
      <div className="max-w-2xl mx-auto px-6 py-12 lg:py-20">
        <div className="bg-surface rounded-2xl border border-border/20 p-8 lg:p-12 text-center">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Trophy className="size-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Quiz Complete</h1>
          <p className="text-muted-foreground mb-8">
            You scored {score} out of {quizQuestions.length}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm mb-8">
            <span className="text-muted-foreground">Accuracy:</span>
            <span className={`font-bold text-lg ${accuracy >= 70 ? "text-good" : accuracy >= 50 ? "text-hard" : "text-again"}`}>
              {accuracy}%
            </span>
          </div>
          <div className="space-y-3 mb-8 text-left">
            {quizQuestions.map((q) => {
              const result = results.find((r) => r.q === q.id);
              const correctLetter = String.fromCharCode(65 + q.correct);
              const selectedLetter =
                result?.selected != null ? String.fromCharCode(65 + result.selected) : "—";
              return (
                <div key={q.id} className="flex items-start gap-3 p-4 rounded-xl bg-surface-raised">
                  {result?.correct ? (
                    <CheckCircle2 className="size-5 text-good shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="size-5 text-again shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium mb-1">{q.question}</p>
                    {!result?.correct && (
                      <p className="text-xs text-muted-foreground">
                        Your answer: {selectedLetter} · Correct: {correctLetter} — {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void startQuiz()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="size-4" />
              Retake Quiz
            </button>
            <Link
              href={`/review?topic=${slug}`}
              className="inline-flex items-center gap-2 px-6 py-3 border border-border/50 rounded-xl font-medium hover:bg-surface-raised transition-colors"
            >
              Review cards
            </Link>
            <Link
              href={`/topics/${slug}`}
              className="inline-flex items-center gap-2 px-6 py-3 border border-border/50 rounded-xl font-medium hover:bg-surface-raised transition-colors"
            >
              Back to topic
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const question = quizQuestions[qIndex];
  if (!question) {
    return layout(<QuizQuestionSkeleton />);
  }

  return layout(
    <div className="max-w-3xl mx-auto px-6 py-8 lg:py-12">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Exit quiz? Progress on this question is lost.")) setStep("setup");
            }}
            className="size-8 flex items-center justify-center rounded-lg hover:bg-surface-raised"
          >
            <X className="size-4" />
          </button>
          <span className="text-sm font-medium">Question {qIndex + 1} of {quizQuestions.length}</span>
        </div>
        <span className="text-xs text-muted-foreground">Score: {score}</span>
      </div>
      <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden mb-8">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((qIndex + 1) / quizQuestions.length) * 100}%` }} />
      </div>

      <div className="bg-surface rounded-2xl border border-border/20 p-8 lg:p-10 mb-6">
        <span className="text-xs font-medium text-primary uppercase tracking-wider mb-4 block">Multiple Choice</span>
        <h2 className="text-xl lg:text-2xl font-medium leading-relaxed mb-8">{question.question}</h2>
        <div className="space-y-2">
          {question.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = answered && i === question.correct;
            const isWrong = answered && isSelected && i !== question.correct;
            const letterClass = isCorrect
              ? "border-good text-good"
              : isWrong
              ? "border-again text-again"
              : isSelected
              ? "border-primary text-primary"
              : "border-border";
            return (
              <button
                key={i}
                type="button"
                onClick={() => !answered && setSelected(i)}
                disabled={answered}
                className={`w-full text-left p-4 rounded-xl border text-sm transition-all ${
                  isCorrect
                    ? "border-good/40 bg-good/10"
                    : isWrong
                    ? "border-again/40 bg-again/10"
                    : isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/20 hover:border-border/40 bg-surface-raised/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`size-6 rounded-full border flex items-center justify-center text-xs font-mono shrink-0 ${letterClass}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </div>
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="mt-6 pt-6 border-t border-border/20">
            <p className="text-sm font-medium mb-2">Explanation</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{question.explanation}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        {!answered ? (
          <button
            type="button"
            onClick={handleAnswer}
            disabled={selected === null}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            Submit Answer
          </button>
        ) : (
          <button
            type="button"
            onClick={nextQuestion}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            {qIndex < quizQuestions.length - 1 ? "Next Question" : "Finish Quiz"}
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function QuizView() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-64 pt-14 lg:pt-0">
          <QuizSetupSkeleton />
        </main>
      </div>
    }>
      <QuizViewInner />
    </Suspense>
  );
}
