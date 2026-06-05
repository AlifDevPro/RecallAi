"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Globe2,
  Building2,
  Sparkles,
  Clock,
  TrendingUp,
  ArrowRight,
  History,
  Filter,
  ClipboardCheck,
  Mic,
  Image as ImageIcon,
  Type,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AIButton } from "@/components/ui/AIButton";
import { MockHubSkeleton } from "@/components/mock/MockSkeletons";

type RecentAttempt = {
  id: string;
  title: string;
  mode: string;
  inst: string;
  score: number;
  total: number;
  time: string;
  date: string;
  status?: string;
};

type Recommendation = { topic: string; reason: string; q: number; mins: number };

export function MockHubView() {
  const [recentAttempts, setRecent] = useState<RecentAttempt[]>([]);
  const [recommended, setRecommended] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    Promise.all([
      fetch("/api/mock/attempts").then(async (r) => {
        if (!r.ok) throw new Error("Failed to load attempts");
        return r.json();
      }),
      fetch("/api/mock/recommendations").then((r) => r.json()),
    ])
      .then(([attemptsData, recsData]) => {
        setRecent(
          (attemptsData.attempts ?? []).slice(0, 5).map(
            (a: {
              id: string;
              title: string;
              score: number;
              max_score: number;
              started_at: string;
              duration_min: number;
              status: string;
              config?: { mode?: string; institutions?: string[] };
            }) => {
              const cfg = a.config ?? {};
              const attemptMode = cfg.mode === "institutional" ? "Institutional" : "Global";
              return {
                id: a.id,
                title: a.title,
                mode: attemptMode,
                inst: cfg.institutions?.[0] ?? "Your attempts",
                score: a.max_score ? Math.round((Number(a.score) / Number(a.max_score)) * 100) : 0,
                total: 100,
                time: `${a.duration_min}m`,
                date: new Date(a.started_at).toLocaleDateString(),
                status: a.status,
              };
            }
          )
        );
        setRecommended(
          (recsData.recommendations ?? []).map((r: { topic: string; reason: string }) => ({
            topic: r.topic,
            reason: r.reason,
            q: 10,
            mins: 30,
          }))
        );
      })
      .catch((e) => {
        setFetchError(e instanceof Error ? e.message : "Failed to load");
        setRecent([]);
        setRecommended([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12 space-y-10">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-semibold uppercase tracking-wider mb-3">
                <ClipboardCheck className="size-3" /> Mock Exam Center
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Sit a real mock. Get a real verdict.</h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
                Strict timing, multi-modal answers (text · voice · handwritten image), AI examiner with rubric-level feedback.
              </p>
            </div>
            <Link
              href="/mock/history"
              className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-lg bg-surface border border-border/40 text-sm hover:border-primary/40"
            >
              <History className="size-4" /> History
            </Link>
          </header>

          {fetchError && (
            <div className="p-3 rounded-xl bg-again/10 border border-again/30 text-sm text-again">
              {fetchError}
            </div>
          )}

          {loading ? (
            <MockHubSkeleton />
          ) : (
          <>
          {/* Mode picker */}
          <section className="grid md:grid-cols-2 gap-4 lg:gap-6">
            <ModeCard
              href="/mock/new?mode=global"
              accent="from-primary/30 via-primary/10 to-transparent"
              icon={Globe2}
              kicker="Type 1"
              title="Global Mock"
              desc="Covers every aspect of the topic from a curated, expert-reviewed question pool."
              chips={["Full syllabus", "Bloom-balanced", "Difficulty mix"]}
            />
            <ModeCard
              href="/mock/new?mode=institutional"
              accent="from-accent/30 via-accent/10 to-transparent"
              icon={Building2}
              kicker="Type 2"
              title="Institutional Mock"
              desc="Modelled on your institution's previous semesters using RAG over past papers."
              chips={["Past papers", "Year filter", "Multi-institution"]}
            />

          </section>

          {/* Modality strip */}
          <section className="rounded-2xl border border-border/40 bg-surface p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <div className="text-sm font-semibold">Answer in your way — time adapts</div>
                <div className="text-xs text-muted-foreground mt-1">Choosing voice shortens the budget; handwritten image extends it.</div>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">Time : Voice &lt; Digital text &lt; Handwritten</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <ModalityPill icon={Type} label="Digital text" mult="×1.0" tone="primary" />
              <ModalityPill icon={Mic} label="Voice" mult="×0.75" tone="accent" />
              <ModalityPill icon={ImageIcon} label="Handwritten image" mult="×1.4" tone="warn" />
            </div>
          </section>

          {/* Recommended */}
          <section>
            <div className="flex items-end justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Recommended for you</h2>
                <p className="text-xs text-muted-foreground mt-1">Generated from your weakest tags this week.</p>
              </div>
              <Link href="/mock/new" className="text-xs text-primary hover:underline">Configure custom</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {loading ? (
                <p className="text-sm text-muted-foreground col-span-full animate-pulse">Loading recommendations…</p>
              ) : recommended.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">Complete a mock exam to get personalized recommendations.</p>
              ) : recommended.map((r) => (
                <div key={r.topic} className="rounded-xl border border-border/40 bg-surface-raised/40 p-4 flex flex-col">
                  <div className="text-sm font-semibold">{r.topic}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{r.reason}</div>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><ClipboardCheck className="size-3" /> {r.q} Q</span>
                    <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {r.mins} min</span>
                  </div>
                  <Link
                    href={`/mock/new?topic=${encodeURIComponent(r.topic)}`}
                    className="mt-4 self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Generate mock
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Recent attempts */}
          <section>
            <div className="flex items-end justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="size-4 text-accent" /> Recent attempts</h2>
                <p className="text-xs text-muted-foreground mt-1">Tap any to see the full evaluation.</p>
              </div>
              <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><Filter className="size-3" /> Filter</button>
            </div>
            <div className="rounded-xl border border-border/40 overflow-hidden bg-surface">
              {loading ? (
                <p className="p-6 text-sm text-muted-foreground animate-pulse">Loading attempts…</p>
              ) : recentAttempts.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  No attempts yet.{" "}
                  <Link href="/mock/new" className="text-primary hover:underline">Start your first mock</Link>
                </p>
              ) : recentAttempts.map((a, i) => (
                <Link
                  key={a.id}
                  href={a.status === "in_progress" ? `/mock/exam/${a.id}` : `/mock/result/${a.id}`}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-4 hover:bg-surface-raised/50 transition-colors ${i > 0 ? "border-t border-border/30" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{a.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${a.mode === "Global" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>{a.mode}</span>
                      <span>{a.inst}</span>
                      <span>· {a.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-lg font-bold tabular-nums">{a.score}<span className="text-xs text-muted-foreground">/{a.total}</span></div>
                      <div className="text-[10px] font-mono text-muted-foreground">{a.time}</div>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
          </>
          )}
        </div>
      </main>
    </div>
  );
}

function ModeCard({
  href, accent, icon: Icon, kicker, title, desc, chips,
}: { href: string; accent: string; icon: React.ComponentType<{ className?: string }>; kicker: string; title: string; desc: string; chips: string[] }) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-surface p-6 sm:p-7 hover:border-primary/40 transition-colors"
    >
      <div className={`pointer-events-none absolute -top-20 -right-20 size-64 rounded-full blur-3xl bg-gradient-to-br ${accent}`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <div className="size-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
            <Icon className="size-6 text-foreground" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80">{kicker}</span>
        </div>
        <div className="text-xl font-bold tracking-tight">{title}</div>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {chips.map((c) => (
            <span key={c} className="px-2 py-0.5 rounded-full bg-surface-raised text-[11px] text-muted-foreground border border-border/30">{c}</span>
          ))}
        </div>
        <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
          Configure & start <ArrowRight className="size-4" />
        </div>
      </div>
    </Link>
  );
}

function ModalityPill({ icon: Icon, label, mult, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; mult: string; tone: "primary" | "accent" | "warn" }) {
  const tones = {
    primary: "border-primary/30 bg-primary/10 text-primary",
    accent: "border-accent/30 bg-accent/10 text-accent",
    warn: "border-hard/30 bg-hard/10 text-hard",
  } as const;
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <Icon className="size-5" />
      <div className="flex-1">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground">time budget {mult}</div>
      </div>
    </div>
  );
}
