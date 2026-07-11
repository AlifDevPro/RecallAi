"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Trophy,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ChevronDown,
  Download,
  Share2,
  BookOpen,
  Type,
  Mic,
  Image as ImageIcon,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AIButton } from "@/components/ui/AIButton";
import { ResultSkeleton } from "@/components/mock/MockSkeletons";
import { QuestionBody } from "@/components/mock/QuestionBody";

type ResultData = {
  score: number;
  total: number;
  percentile: number;
  timeUsed: string;
  timeBudget: string;
  modalityMix: { text: number; voice: number; image: number };
  questions: {
    id: string;
    body: string;
    status: string;
    marks: number;
    awarded: number;
    modality: string;
    your: string;
    model: string;
    deductions: string[];
  }[];
  weakness: { tag: string; score: number }[];
  strength: { tag: string; score: number }[];
};

const emptyResult: ResultData = {
  score: 0,
  total: 100,
  percentile: 0,
  timeUsed: "—",
  timeBudget: "—",
  modalityMix: { text: 100, voice: 0, image: 0 },
  questions: [],
  weakness: [],
  strength: [],
};

export function ResultView() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const [result, setResult] = useState<ResultData>(emptyResult);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryTopic, setRetryTopic] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const r = await fetch(`/api/mock/attempts/${attemptId}/result`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load result");
        if (!d.attempt) return;

        if (d.attempt.status === "submitted") {
          setGrading(true);
          if (!cancelled) pollTimer = setTimeout(load, 3000);
          return;
        }
        setGrading(false);

        const max = Number(d.attempt.maxScore) || 100;
        const score = Number(d.attempt.score) || 0;
        const scorePercent = d.attempt.scorePercent ?? Math.round((score / max) * 100);
        const topics = (d.attempt.config?.topics as string[] | undefined) ?? [];
        setRetryTopic(topics[0] ?? null);

        if (!cancelled) {
          setResult({
            score: scorePercent,
            total: 100,
            percentile: scorePercent,
            timeUsed: d.attempt.timeUsed ?? "—",
            timeBudget: d.attempt.timeBudget ?? "—",
            modalityMix: d.modalityMix ?? emptyResult.modalityMix,
            questions: (d.breakdown ?? []).map(
              (b: {
                questionId: string;
                body: string;
                marks: number;
                score: number;
                feedback: string;
                answer: string;
                modelAnswer?: string;
                deductions?: string[];
                modality?: string;
              }) => ({
                id: b.questionId,
                body: b.body,
                status: b.score >= b.marks ? "correct" : b.score > 0 ? "partial" : "wrong",
                marks: b.marks,
                awarded: b.score,
                modality: b.modality ?? "text",
                your: b.answer,
                model: b.modelAnswer || b.feedback,
                deductions: b.deductions?.length ? b.deductions : b.score < b.marks && b.feedback ? [b.feedback] : [],
              })
            ),
            weakness: d.weakness ?? [],
            strength: d.strength ?? [],
          });
        }
      } catch (e) {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [attemptId]);

  const data = result;

  if (loading || grading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-64 pt-14 lg:pt-0">
          {grading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
              <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium">Grading in progress…</p>
              <p className="text-xs text-muted-foreground mt-1">Results will appear shortly</p>
            </div>
          ) : (
            <ResultSkeleton />
          )}
        </main>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-64 pt-14 lg:pt-0 flex items-center justify-center min-h-[50vh]">
          <div className="text-center px-6">
            <p className="text-again font-medium">{fetchError}</p>
            <Link href="/mock/history" className="mt-3 inline-block text-sm text-primary hover:underline">
              Back to history
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12 space-y-8">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-surface via-surface to-surface-dim p-6 sm:p-8">
            <div className="absolute -top-24 -right-24 size-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-semibold uppercase tracking-wider mb-3">
                  <Trophy className="size-3" /> Evaluation Complete
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">{data.score}</span>
                  <span className="text-xl text-muted-foreground">/ {data.total}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Score: {data.percentile}% of total marks</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Stat icon={Clock} label="Time used" value={data.timeUsed} sub={`of ${data.timeBudget}`} />
                <Stat icon={Target} label="Accuracy" value={`${data.score}%`} sub="weighted" />
                <ModalityDonut mix={data.modalityMix} />
              </div>
            </div>
            <div className="relative mt-6 flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border border-border/40 hover:bg-surface-raised"><Download className="size-4" /> Export PDF</button>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(window.location.href)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border border-border/40 hover:bg-surface-raised"
              >
                <Share2 className="size-4" /> Copy link
              </button>
              <Link
                href={retryTopic ? `/mock/new?topic=${encodeURIComponent(retryTopic)}` : "/mock/new"}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border border-primary/40 text-primary hover:bg-primary/10"
              >
                Retry similar
              </Link>
              {data.weakness[0] && (
                <Link
                  href={`/review?topic=${encodeURIComponent(data.weakness[0].tag)}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border border-border/40 hover:bg-surface-raised"
                >
                  Review weak topic
                </Link>
              )}
            </div>
          </section>

          {/* Weakness / Strength */}
          <section className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border/40 bg-surface p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2"><AlertCircle className="size-4 text-[var(--exam-danger)]" /> Weak spots</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Tap a tag to open AI Tutor pre-loaded with this concept.</p>
              <div className="space-y-2">
                {data.weakness.map((w) => (
                  <Link key={w.tag} href={`/tutor?topic=${encodeURIComponent(w.tag)}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-raised/60 group">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{w.tag}</div>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-raised overflow-hidden">
                        <div className="h-full bg-[var(--exam-danger)]" style={{ width: `${w.score}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-[var(--exam-danger)]">{w.score}%</span>
                    <BookOpen className="size-4 text-muted-foreground group-hover:text-primary" />
                  </Link>
                ))}
              </div>
              <AIButton className="mt-5 w-full sm:w-auto">Build my catch-up plan</AIButton>
            </div>
            <div className="rounded-2xl border border-border/40 bg-surface p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="size-4 text-[var(--exam-ok)]" /> Strengths</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Keep these warm with weekly spaced reviews.</p>
              <div className="space-y-2">
                {data.strength.map((s) => (
                  <div key={s.tag} className="flex items-center gap-3 p-2.5 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{s.tag}</div>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-raised overflow-hidden">
                        <div className="h-full bg-[var(--exam-ok)]" style={{ width: `${s.score}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-[var(--exam-ok)]">{s.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Per-question */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Per-question review</h3>
            <div className="rounded-2xl border border-border/40 overflow-hidden divide-y divide-border/30 bg-surface">
              {data.questions.map((q, i) => <QuestionRow key={q.id} q={q} idx={i} />)}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

type QData = ResultData["questions"][number];

function QuestionRow({ q, idx }: { q: QData; idx: number }) {
  const [open, setOpen] = useState(idx === 0);
  const statusTone =
    q.status === "correct" ? { icon: CheckCircle2, color: "text-[var(--exam-ok)]", bg: "bg-[var(--exam-ok)]/10" } :
    q.status === "partial" ? { icon: AlertCircle, color: "text-[var(--exam-warn)]", bg: "bg-[var(--exam-warn)]/10" } :
                              { icon: XCircle, color: "text-[var(--exam-danger)]", bg: "bg-[var(--exam-danger)]/10" };
  const ModalityIcon = q.modality === "voice" ? Mic : q.modality === "image" ? ImageIcon : Type;
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-surface-raised/40">
        <div className={`size-9 rounded-lg flex items-center justify-center ${statusTone.bg}`}>
          <statusTone.icon className={`size-4 ${statusTone.color}`} />
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <div className="text-sm font-semibold line-clamp-2">Q{idx + 1}. {q.body}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><ModalityIcon className="size-3" /> {q.modality}</span>
            <span>·</span>
            <span className={statusTone.color}>{q.status}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold tabular-nums">{q.awarded}<span className="text-xs text-muted-foreground">/{q.marks}</span></div>
        </div>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-5 pt-1 space-y-4">
          <div className="rounded-xl border border-border/40 bg-surface-raised/20 p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Question</div>
            <QuestionBody text={q.body} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border/40 bg-surface-raised/40 p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Your answer</div>
            <QuestionBody text={q.your || "(no answer submitted)"} className="text-sm text-foreground/90" />
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-primary mb-2">Model answer</div>
            <QuestionBody text={q.model || "—"} className="text-sm text-foreground/90" />
          </div>
          </div>
          {q.deductions.length > 0 && (
            <div className="md:col-span-2 rounded-lg border border-border/40 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" /> AI Examiner rubric
              </div>
              <ul className="space-y-1 text-sm">
                {q.deductions.map((d, j) => (
                  <li key={j} className="flex items-start gap-2 text-[var(--exam-warn)]">
                    <XCircle className="size-3.5 mt-0.5 shrink-0" />
                    <span className="text-foreground/85">{d}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Link href={`/tutor?topic=${encodeURIComponent(q.body.slice(0, 40))}`} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-primary/30 text-primary hover:bg-primary/10">
                  <BookOpen className="size-3.5" /> Teach me this in depth
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface px-4 py-3 min-w-[120px]">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground"><Icon className="size-3" /> {label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function ModalityDonut({ mix }: { mix: { text: number; voice: number; image: number } }) {
  const total = mix.text + mix.voice + mix.image;
  const seg = (v: number) => (v / total) * 100;
  // SVG donut
  const r = 26, c = 2 * Math.PI * r;
  const txt = seg(mix.text);
  const vox = seg(mix.voice);
  const img = seg(mix.image);
  return (
    <div className="rounded-xl border border-border/40 bg-surface px-4 py-3 flex items-center gap-3">
      <svg width={64} height={64} viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-raised)" strokeWidth="10" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--primary)" strokeWidth="10" strokeDasharray={`${(txt / 100) * c} ${c}`} />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeDasharray={`${(vox / 100) * c} ${c}`} strokeDashoffset={`-${(txt / 100) * c}`} />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--hard)" strokeWidth="10" strokeDasharray={`${(img / 100) * c} ${c}`} strokeDashoffset={`-${((txt + vox) / 100) * c}`} />
      </svg>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground space-y-0.5">
        <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> Text {mix.text}%</div>
        <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" /> Voice {mix.voice}%</div>
        <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-hard" /> Image {mix.image}%</div>
      </div>
    </div>
  );
}
