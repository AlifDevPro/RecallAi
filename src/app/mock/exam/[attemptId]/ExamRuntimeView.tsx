"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExamSkeleton } from "@/components/mock/MockSkeletons";
import { QuestionBody } from "@/components/mock/QuestionBody";
import type { MockConfig } from "@/lib/mock/validate-config";
import { normalizeMockConfig } from "@/lib/mock/validate-config";
import {
  Type,
  Mic,
  Image as ImageIcon,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  AlertTriangle,
  Building2,
  Clock,
  Sun,
  Square,
  Upload,
  Trash2,
} from "lucide-react";

type ExamQuestion = {
  id: string;
  section: string;
  marks: number;
  year?: number;
  bloom?: string;
  body: string;
  choices?: string[];
};

type Modality = "text" | "voice" | "image";
type Answer = {
  modality: Modality;
  text?: string;
  voiceDur?: number;
  images?: string[];
  audioUrl?: string;
  flagged?: boolean;
};

type ExamState = "loading" | "error" | "empty" | "ready" | "grading";

function shuffleQuestions<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseChoices(raw: unknown): string[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "object" && raw !== null && "options" in raw) {
    const opts = (raw as { options?: unknown[] }).options;
    return Array.isArray(opts) ? opts.map(String) : undefined;
  }
  return undefined;
}

function mapServerAnswer(raw: Record<string, unknown>): Answer {
  const audioUrl = (raw.answer_audio_url as string) || undefined;
  const imageUrl = (raw.answer_image_url as string) || undefined;
  return {
    modality: (raw.answer_modality as Modality) ?? (audioUrl ? "voice" : imageUrl ? "image" : "text"),
    text: (raw.answer_text as string) || undefined,
    audioUrl,
    images: imageUrl ? [imageUrl] : undefined,
    voiceDur: audioUrl ? 1 : 0,
  };
}

function orderQuestions<T extends { id: string }>(
  items: T[],
  order: string[] | undefined,
  shuffle: boolean
): T[] {
  if (order?.length === items.length) {
    const byId = new Map(items.map((q) => [q.id, q]));
    const ordered = order.map((id) => byId.get(id)).filter(Boolean) as T[];
    if (ordered.length === items.length) return ordered;
  }
  return shuffle ? shuffleQuestions(items) : items;
}

export function ExamRuntimeView() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const router = useRouter();
  const storageKey = `recall.mockAttempt.${attemptId}`;

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [attemptTitle, setAttemptTitle] = useState("Mock Exam");
  const [examConfig, setExamConfig] = useState<MockConfig | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(90 * 60);
  const [examState, setExamState] = useState<ExamState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const autoSubmitRef = useRef(false);
  const orderPersistedRef = useRef(false);

  const loadAttempt = useCallback(async () => {
    setExamState("loading");
    setLoadError(null);
    try {
      const r = await fetch(`/api/mock/attempts/${attemptId}`);
      const d = await r.json();
      if (!r.ok) {
        setLoadError(d.error ?? "Exam not found");
        setExamState("error");
        return;
      }
      if (d.attempt?.status === "graded" || d.attempt?.status === "submitted") {
        router.replace(`/mock/result/${attemptId}`);
        return;
      }
      const config = normalizeMockConfig(d.attempt?.config ?? {});
      setExamConfig(config);
      const rawQs = (d.questions ?? []).map(
        (q: {
          id: string;
          body: string;
          marks: number;
          topic: string;
          section: string;
          choices?: unknown;
          answer?: Record<string, unknown>;
        }) => ({
          id: q.id,
          section: q.section ?? "Short",
          marks: q.marks,
          body: q.body,
          choices: parseChoices(q.choices),
          bloom: q.topic || "Apply",
          year: new Date().getFullYear(),
        })
      );
      if (rawQs.length === 0) {
        setExamState("empty");
        return;
      }

      const qs = orderQuestions(rawQs, config.questionOrder, config.rules.shuffle) as ExamQuestion[];
      if (config.rules.shuffle && !config.questionOrder?.length && !orderPersistedRef.current) {
        orderPersistedRef.current = true;
        void fetch(`/api/mock/attempts/${attemptId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionOrder: qs.map((q) => q.id) }),
        });
      }

      const serverAnswers: Record<string, Answer> = {};
      for (const q of d.questions ?? []) {
        if (q.answer && typeof q.answer === "object") {
          serverAnswers[q.id] = mapServerAnswer(q.answer as Record<string, unknown>);
        }
      }

      let restoredAnswers = { ...serverAnswers };
      let restoredCurrent = 0;
      let restoredSeconds = d.attempt?.durationMin ? d.attempt.durationMin * 60 : 90 * 60;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const s = JSON.parse(raw);
          if (s.answers) restoredAnswers = { ...serverAnswers, ...s.answers };
          if (typeof s.current === "number") restoredCurrent = s.current;
          if (typeof s.secondsLeft === "number") {
            const elapsed = Math.floor((Date.now() - (s.savedAt ?? Date.now())) / 1000);
            restoredSeconds = Math.max(0, s.secondsLeft - elapsed);
          }
        }
      } catch {
        /* noop */
      }

      setQuestions(qs);
      setAnswers(restoredAnswers);
      setCurrent(Math.min(restoredCurrent, qs.length - 1));
      setSecondsLeft(restoredSeconds);
      if (d.attempt?.title) setAttemptTitle(d.attempt.title);
      setExamState("ready");
    } catch {
      setLoadError("Failed to load exam");
      setExamState("error");
    }
  }, [attemptId, router, storageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAttempt(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAttempt]);

  useEffect(() => {
    if (examState !== "ready") return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [examState]);

  useEffect(() => {
    if (examState !== "ready" || secondsLeft > 0) return;
    if (autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    setConfirmSubmit(true);
  }, [secondsLeft, examState]);

  useEffect(() => {
    if (examState !== "ready") return;
    localStorage.setItem(storageKey, JSON.stringify({ answers, current, secondsLeft, savedAt: Date.now() }));
    if (!questions.length) return;
    const t = setTimeout(() => {
      const payload = questions
        .filter((q) => {
          const a = answers[q.id];
          return a?.text || a?.audioUrl || (a?.images && a.images.length > 0);
        })
        .map((q) => {
          const a = answers[q.id];
          return {
            questionId: q.id,
            answerText: a?.text,
            answerAudioUrl: a?.audioUrl,
            answerImageUrl: a?.images?.[0],
            answerModality: a?.modality,
          };
        });
      if (!payload.length) return;
      fetch(`/api/mock/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      })
        .then(async (r) => {
          if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error((d as { error?: string }).error ?? "Autosave failed");
          }
          setSaveError(null);
        })
        .catch((e) => {
          setSaveError(e instanceof Error ? e.message : "Could not save answers");
        });
    }, 800);
    return () => clearTimeout(t);
  }, [answers, current, secondsLeft, storageKey, attemptId, questions, examState]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && examConfig?.rules.fullscreen) {
        setTabSwitches((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [examConfig?.rules.fullscreen]);

  const status = useMemo(
    () =>
      questions.map((qq) => {
        const ans = answers[qq.id];
        if (!ans) return "unseen" as const;
        if (ans.flagged) return "flagged" as const;
        if (
          (ans.text && ans.text.trim()) ||
          ans.audioUrl ||
          (ans.images && ans.images.length > 0) ||
          (ans.voiceDur && ans.voiceDur > 0)
        )
          return "answered" as const;
        return "seen" as const;
      }),
    [answers, questions]
  );

  if (examState === "loading") {
    return <ExamSkeleton />;
  }

  if (examState === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
        <AlertTriangle className="size-10 text-again mb-3" />
        <h1 className="text-xl font-semibold">{loadError ?? "Could not load exam"}</h1>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => void loadAttempt()} className="text-sm text-primary hover:underline">
            Retry
          </button>
          <Link href="/mock" className="text-sm text-muted-foreground hover:underline">
            Back to hub
          </Link>
        </div>
      </div>
    );
  }

  if (examState === "empty") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-xl font-semibold">No questions in this attempt</h1>
        <p className="text-sm text-muted-foreground mt-2">Try generating a new mock exam.</p>
        <Link href="/mock/new" className="mt-4 text-sm text-primary hover:underline">
          Configure new mock
        </Link>
      </div>
    );
  }

  if (examState === "grading") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
        <div className="size-12 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <h1 className="text-xl font-semibold">Grading your answers…</h1>
        <p className="text-sm text-muted-foreground mt-2">{gradingProgress}% complete</p>
      </div>
    );
  }

  const q = questions[current];
  const a = answers[q.id] ?? { modality: "text" as Modality };

  const setAnswer = (patch: Partial<Answer>) =>
    setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], modality: a.modality, ...patch } }));

  const timerTone = secondsLeft < 60 ? "danger" : secondsLeft < 300 ? "warn" : "ok";

  const handleSubmit = async () => {
    setExamState("grading");
    setGradingProgress(10);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/mock/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tabSwitches,
          answers: questions.map((qq) => {
            const a = answers[qq.id];
            return {
              questionId: qq.id,
              answerText: a?.text ?? "",
              answerAudioUrl: a?.audioUrl,
              answerImageUrl: a?.images?.[0],
              answerModality: a?.modality ?? "text",
            };
          }),
        }),
      });
      setGradingProgress(80);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Submit failed");
      }
      setGradingProgress(100);
      localStorage.removeItem(storageKey);
      router.push(`/mock/result/${attemptId}`);
    } catch (e) {
      setExamState("ready");
      setConfirmSubmit(true);
      setSubmitError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    }
  };

  return (
    <div className={`min-h-screen ${highContrast ? "bg-black text-white" : "bg-background text-foreground"} flex flex-col`}>
      {/* Top bar */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-border/40 bg-surface-dim/60 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <button className="lg:hidden size-9 rounded-lg hover:bg-surface" onClick={() => setNavOpen(true)} aria-label="Open navigator"><Flag className="size-4" /></button>
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface border border-border/40">
            <Building2 className="size-3.5 text-accent" />
            <span className="text-xs font-medium">{attemptTitle}</span>
          </div>
          <span className="hidden md:inline text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Section · {q.section}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-base sm:text-lg font-bold tabular-nums tracking-tight border ${
            timerTone === "danger" ? "border-[var(--exam-danger)] text-[var(--exam-danger)] bg-[var(--exam-danger)]/10 animate-pulse" :
            timerTone === "warn" ? "border-[var(--exam-warn)] text-[var(--exam-warn)] bg-[var(--exam-warn)]/10" :
            "border-[var(--exam-ok)] text-[var(--exam-ok)] bg-[var(--exam-ok)]/10"
          }`}>
            <Clock className="size-4" /> {fmt(secondsLeft)}
          </div>
          <button onClick={() => setHighContrast((v) => !v)} className="size-9 rounded-lg hover:bg-surface flex items-center justify-center" title="Toggle contrast"><Sun className="size-4" /></button>
        </div>
      </header>

      {/* Tab-switch toast */}
      {tabSwitches > 0 && (
        <div className="bg-[var(--exam-warn)]/15 border-b border-[var(--exam-warn)]/40 px-4 py-2 text-xs flex items-center gap-2 text-[var(--exam-warn)]">
          <AlertTriangle className="size-3.5" /> Tab-switch detected ({tabSwitches}) — strict mode logs these to your attempt.
        </div>
      )}
      {saveError && (
        <div className="bg-again/10 border-b border-again/30 px-4 py-2 text-xs flex items-center justify-between gap-2 text-again">
          <span className="flex items-center gap-2"><AlertTriangle className="size-3.5" /> {saveError}</span>
          <button type="button" onClick={() => setSaveError(null)} className="underline">Dismiss</button>
        </div>
      )}

      <div className="flex-1 grid lg:grid-cols-[260px_1fr_360px] gap-0 min-h-0">
        {/* Navigator */}
        <aside className="hidden lg:flex flex-col border-r border-border/40 bg-surface-dim/40">
          <NavigatorGrid status={status} current={current} onJump={setCurrent} />
        </aside>
        {navOpen && (
          <div className="fixed inset-0 z-50 bg-background/95 lg:hidden flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-border/40">
              <span className="font-semibold">Question navigator</span>
              <button onClick={() => setNavOpen(false)} className="size-9 rounded-lg hover:bg-surface flex items-center justify-center"><X className="size-4" /></button>
            </div>
            <NavigatorGrid status={status} current={current} onJump={(i) => { setCurrent(i); setNavOpen(false); }} />
          </div>
        )}

        {/* Question */}
        <section className="overflow-y-auto p-5 sm:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-border/40 bg-card/50 p-5 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-5 gap-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary">Q{current + 1} / {questions.length}</span>
                <span>{q.marks} marks</span>
                <span>·</span>
                <span>{q.section}</span>
              </div>
              <button
                onClick={() => setAnswer({ flagged: !a.flagged })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shrink-0 ${a.flagged ? "border-hard text-hard bg-hard/10" : "border-border/40 text-muted-foreground hover:text-foreground"}`}
              >
                <Flag className="size-3.5" /> {a.flagged ? "Flagged" : "Flag"}
              </button>
            </div>

            <div className="rounded-xl bg-surface-raised/30 border border-border/30 p-4 sm:p-5 mb-5">
              <QuestionBody text={q.body} className="font-medium text-foreground" />
            </div>

            {q.choices && (
              <div className="space-y-2.5">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Select one answer</p>
                {q.choices.map((c, i) => {
                  const selected = a.text === c;
                  return (
                    <button
                      key={i}
                      onClick={() => setAnswer({ text: c, modality: "text" })}
                      className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${selected ? "border-primary bg-primary/10 shadow-sm" : "border-border/40 bg-surface hover:border-primary/40 hover:bg-surface-raised/50"}`}
                    >
                      <span className={`size-7 shrink-0 rounded-full flex items-center justify-center text-xs font-mono font-bold border mt-0.5 ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground bg-background"}`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <QuestionBody text={c} className="text-sm flex-1" />
                    </button>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </section>

        {/* Answer panel (right) */}
        {!q.choices && (
          <aside className="border-t lg:border-t-0 lg:border-l border-border/40 bg-surface flex flex-col">
            <AnswerPanel
              attemptId={attemptId}
              questionId={q.id}
              answer={a}
              setAnswer={setAnswer}
              strict={examConfig?.rules.strict ?? false}
              defaultModality={examConfig?.modality ?? "text"}
              mixed={examConfig?.mixed ?? true}
            />
          </aside>
        )}
      </div>

      {/* Bottom bar */}
      <footer className="h-16 border-t border-border/40 bg-surface-dim/60 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6">
        <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border/40 hover:bg-surface disabled:opacity-40">
          <ChevronLeft className="size-4" /> Prev
        </button>
        <div className="flex items-center gap-2">
          {current < questions.length - 1 ? (
            <button onClick={() => setCurrent(current + 1)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
              Save & next <ChevronRight className="size-4" />
            </button>
          ) : (
            <button onClick={() => setConfirmSubmit(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--exam-ok)] text-background hover:opacity-90">
              <Send className="size-4" /> Submit exam
            </button>
          )}
        </div>
      </footer>

      {/* Submit confirm */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-6">
            <h3 className="text-lg font-bold">Submit final answers?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {secondsLeft === 0
                ? "Time is up — submit now to record your answers."
                : `${status.filter((s) => s !== "answered").length} of ${questions.length} questions are not fully answered. AI evaluation begins immediately.`}
            </p>
            {submitError && (
              <div className="mt-4 rounded-lg border border-again/30 bg-again/10 px-3 py-2 text-sm text-again">
                {submitError}
              </div>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setConfirmSubmit(false)} className="px-3 py-2 rounded-lg text-sm border border-border/40 hover:bg-surface">Cancel</button>
              <button type="button" onClick={() => void handleSubmit()} className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--exam-ok)] text-background">Submit & evaluate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function NavigatorGrid({ status, current, onJump }: { status: Array<"unseen" | "seen" | "answered" | "flagged">; current: number; onJump: (i: number) => void }) {
  return (
    <div className="p-4 overflow-y-auto">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Questions</div>
      <div className="grid grid-cols-5 gap-1.5">
        {status.map((s, i) => {
          const isCur = i === current;
          const tone = s === "answered" ? "bg-[var(--exam-ok)]/20 text-[var(--exam-ok)] border-[var(--exam-ok)]/40" :
                       s === "flagged" ? "bg-hard/20 text-hard border-hard/40" :
                       s === "seen" ? "bg-surface-raised text-foreground border-border/40" :
                       "bg-surface text-muted-foreground border-border/30";
          return (
            <button key={i} onClick={() => onJump(i)} className={`relative aspect-square rounded-md text-xs font-mono font-semibold border transition-all ${tone} ${isCur ? "ring-2 ring-primary" : ""}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-5 space-y-1.5 text-[11px] text-muted-foreground">
        <Legend tone="bg-[var(--exam-ok)]/30 border-[var(--exam-ok)]/50" label="Answered" />
        <Legend tone="bg-hard/30 border-hard/50" label="Flagged" />
        <Legend tone="bg-surface-raised border-border/40" label="Seen" />
        <Legend tone="bg-surface border-border/30" label="Unseen" />
      </div>
    </div>
  );
}
function Legend({ tone, label }: { tone: string; label: string }) {
  return <div className="flex items-center gap-2"><span className={`size-3 rounded border ${tone}`} />{label}</div>;
}

function AnswerPanel({
  attemptId,
  questionId,
  answer,
  setAnswer,
  strict,
  defaultModality,
  mixed,
}: {
  attemptId: string;
  questionId: string;
  answer: Answer;
  setAnswer: (p: Partial<Answer>) => void;
  strict: boolean;
  defaultModality: Modality;
  mixed: boolean;
}) {
  const tabs: { id: Modality; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { id: "text", icon: Type, label: "Text" },
    { id: "voice", icon: Mic, label: "Voice" },
    { id: "image", icon: ImageIcon, label: "Image" },
  ];
  const visibleTabs = mixed ? tabs : tabs.filter((t) => t.id === defaultModality);

  useEffect(() => {
    if (!mixed && answer.modality !== defaultModality) {
      setAnswer({ modality: defaultModality });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, mixed, defaultModality]);

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="flex border-b border-border/40">
        {visibleTabs.map((t) => {
          const active = answer.modality === t.id;
          return (
            <button key={t.id} onClick={() => setAnswer({ modality: t.id })} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="size-4" /> {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {answer.modality === "text" && (
          <TextAnswer strict={strict} value={answer.text ?? ""} onChange={(v) => setAnswer({ text: v, modality: "text" })} />
        )}
        {answer.modality === "voice" && (
          <VoiceAnswer
            attemptId={attemptId}
            questionId={questionId}
            dur={answer.voiceDur ?? 0}
            audioUrl={answer.audioUrl}
            onRecorded={(d, url) => setAnswer({ voiceDur: d, audioUrl: url, modality: "voice" })}
            onClear={() => setAnswer({ voiceDur: 0, audioUrl: undefined, modality: "voice" })}
            onChange={(d) => setAnswer({ voiceDur: d })}
          />
        )}
        {answer.modality === "image" && (
          <ImageAnswer
            attemptId={attemptId}
            questionId={questionId}
            images={answer.images ?? []}
            onChange={(imgs) => setAnswer({ images: imgs, modality: "image" })}
          />
        )}
      </div>
    </div>
  );
}

function TextAnswer({
  value,
  onChange,
  strict,
}: {
  value: string;
  onChange: (v: string) => void;
  strict: boolean;
}) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="flex flex-col h-full">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => strict && e.preventDefault()}
        placeholder="Type your answer here. Use clear paragraphs for multi-part questions."
        className="flex-1 min-h-[280px] resize-none p-4 rounded-xl bg-surface-raised/40 border border-border/40 text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
      />
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{words} words · autosaved</span>
        <span className="font-mono">draft</span>
      </div>
    </div>
  );
}

function VoiceAnswer({
  attemptId,
  questionId,
  dur,
  audioUrl,
  onChange,
  onRecorded,
  onClear,
}: {
  attemptId: string;
  questionId: string;
  dur: number;
  audioUrl?: string;
  onChange: (d: number) => void;
  onRecorded: (dur: number, url: string) => void;
  onClear: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!recording) return;
    startedRef.current = Date.now() - dur * 1000;
    const t = setInterval(() => {
      if (startedRef.current) onChange(Math.floor((Date.now() - startedRef.current) / 1000));
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = async () => {
    setRecording(false);
    const recorder = mediaRef.current;
    if (!recorder) return;
    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size > 0) {
      setUploading(true);
      setError(null);
      const form = new FormData();
      form.append("attemptId", attemptId);
      form.append("questionId", questionId);
      form.append("audio", blob, "answer.webm");
      const finalDur = startedRef.current
        ? Math.floor((Date.now() - startedRef.current) / 1000)
        : dur;
      try {
        const r = await fetch("/api/mock/answers/audio", { method: "POST", body: form });
        const data = await r.json();
        if (!r.ok || !data.url) throw new Error(data.error ?? "Upload failed");
        onRecorded(finalDur, data.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save recording");
      } finally {
        setUploading(false);
      }
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone permission denied or unavailable.");
      setRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className={`size-32 rounded-full flex items-center justify-center border-2 ${recording ? "border-[var(--exam-danger)] bg-[var(--exam-danger)]/10" : "border-primary/40 bg-primary/5"}`}>
        <button onClick={() => (recording ? stopRecording() : startRecording())} className={`size-20 rounded-full flex items-center justify-center text-primary-foreground ${recording ? "bg-[var(--exam-danger)]" : "bg-primary"}`}>
          {recording ? <Square className="size-7" /> : <Mic className="size-7" />}
        </button>
      </div>
      <div className="mt-4 font-mono tabular-nums text-2xl">{Math.floor(dur / 60).toString().padStart(2, "0")}:{(dur % 60).toString().padStart(2, "0")}</div>
      <div className="text-xs text-muted-foreground mt-1">
        {uploading ? "Uploading…" : recording ? "Recording…" : audioUrl || dur ? "Recording saved" : "Tap to start recording"}
      </div>
      {error && <p className="mt-2 text-xs text-again">{error}</p>}
      {(dur > 0 || audioUrl) && !recording && !uploading && (
        <div className="mt-4 flex items-center gap-2">
          {audioUrl && (
            <audio controls src={audioUrl} className="max-w-full h-9" />
          )}
          <button onClick={() => onClear()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border/40 text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5" /> Discard</button>
        </div>
      )}
      <div className="mt-5 w-full rounded-lg bg-surface-raised/40 p-3 text-left">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Live transcript (preview)</div>
        <div className="text-xs text-foreground/80 italic min-h-[40px]">
          {recording ? "…transcribing on-device…" : dur ? "Transcript will be generated on submit." : "—"}
        </div>
      </div>
    </div>
  );
}

function ImageAnswer({
  attemptId,
  questionId,
  images,
  onChange,
}: {
  attemptId: string;
  questionId: string;
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    setError(null);
    const urls: string[] = [...images];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files (JPG, PNG) are supported.");
        continue;
      }
      const form = new FormData();
      form.append("attemptId", attemptId);
      form.append("questionId", questionId);
      form.append("image", file);
      try {
        const res = await fetch("/api/mock/answers/image", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
        urls.push(data.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    }
    onChange(urls);
    setUploading(false);
  };
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 bg-surface-raised/30 text-sm"
      >
        <Upload className="size-6 text-muted-foreground" />
        <span className="font-medium">Capture or upload pages</span>
        <span className="text-[11px] text-muted-foreground">JPG, PNG · multiple pages OK</span>
      </button>
      {uploading && <p className="text-xs text-muted-foreground text-center">Uploading…</p>}
      {error && <p className="text-xs text-again text-center">{error}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border/40 aspect-[3/4] bg-surface-raised">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
              <button onClick={() => onChange(images.filter((_, j) => j !== i))} className="absolute top-1.5 right-1.5 size-7 rounded-md bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100">
                <X className="size-3.5" />
              </button>
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-background/80 text-[10px] font-mono">p{i + 1}</div>
            </div>
          ))}
        </div>
      )}
      <div className="text-[11px] text-muted-foreground">OCR runs on submission — you can preview the extracted text on the result page.</div>
    </div>
  );
}
