"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Calendar,
  Edit3,
  Trash2,
  Pause,
  Plus,
  BrainCircuit,
  CheckCircle2,
  Circle,
  Sparkles,
  Target,
  Flag,
  BookOpen,
  Lightbulb,
  Zap,
  ChevronRight,
  PlayCircle,
  Award,
  AlertCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { StudyTimer, type StudyTimerHandle } from "@/components/ui/StudyTimer";
import { invalidateTopicMutations } from "@/lib/query/invalidate-learning";
import type { RoadmapMilestone } from "@/lib/topics/validate-topic";

type CardRow = {
  id: string;
  front: string;
  back: string;
  retention: number;
  lastReviewed: string;
  nextReview: string;
  due?: boolean;
};

type Milestone = RoadmapMilestone;

type TopicPayload = {
  topic: {
    name: string;
    slug: string;
    status: string;
    mastery: number;
    due: number;
    cards: CardRow[];
    roadmap: Milestone[];
  };
};

function TopicDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-40 rounded-3xl bg-surface border border-border/20" />
      <div className="h-10 w-72 bg-surface rounded-xl" />
      <div className="h-64 rounded-2xl bg-surface border border-border/20" />
    </div>
  );
}

export function TopicDetailView() {
  const params = useParams<{ topicId: string }>();
  const topicId = params.topicId;
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"roadmap" | "cards" | "insights">("roadmap");
  const timerRef = useRef<StudyTimerHandle>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [roadmap, setRoadmap] = useState<Milestone[]>([]);
  const [roadmapSaving, setRoadmapSaving] = useState(false);

  const topicQuery = useQuery({
    queryKey: ["topic", topicId],
    queryFn: async () => {
      const r = await fetch(`/api/me/topics/${topicId}`);
      if (r.status === 404) return { notFound: true as const };
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Failed to load topic");
      }
      return { notFound: false as const, data: (await r.json()) as TopicPayload };
    },
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/me/dashboard");
      if (!r.ok) return { streakDays: 0 };
      return r.json() as Promise<{ streakDays?: number }>;
    },
  });

  const topicData = topicQuery.data?.notFound === false ? topicQuery.data.data.topic : null;
  const topicName = topicData?.name ?? "";
  const topicStatus = topicData?.status ?? "active";
  const cards = topicData?.cards ?? [];
  const dueCount = topicData?.due ?? 0;
  const loading = topicQuery.isLoading;
  const notFound = topicQuery.data?.notFound === true;
  const fetchError = topicQuery.error?.message ?? null;

  useEffect(() => {
    if (topicData?.roadmap) {
      setRoadmap(topicData.roadmap);
    }
  }, [topicData?.roadmap]);

  const refetchTopic = () => {
    void topicQuery.refetch();
    invalidateTopicMutations(queryClient, topicId);
  };

  const saveRoadmap = async (next: Milestone[]) => {
    setRoadmapSaving(true);
    try {
      const res = await fetch(`/api/me/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roadmap: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Failed to save roadmap");
      }
      setRoadmap(next);
      refetchTopic();
    } finally {
      setRoadmapSaving(false);
    }
  };

  const displayRoadmap = roadmap.length > 0 ? roadmap : (topicData?.roadmap ?? []);

  const avgRetention = cards.length
    ? Math.round(cards.reduce((s, c) => s + c.retention, 0) / cards.length)
    : 0;
  const weakCards = cards.filter((c) => c.retention < 60);
  const streakDays = dashboardQuery.data?.streakDays ?? 0;
  const totalTasks = displayRoadmap.reduce((s, m) => s + (m.tasks?.length ?? 0), 0);
  const doneTasks = displayRoadmap.reduce((s, m) => s + (m.tasks?.filter((t) => t.done).length ?? 0), 0);
  const overall = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : avgRetention;
  const performance = cards.slice(0, 12).map((c) => c.retention);

  if (!loading && notFound) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen flex items-center justify-center">
          <div className="text-center px-6">
            <h1 className="text-xl font-semibold">Topic not found</h1>
            <p className="text-sm text-muted-foreground mt-2">This topic may have been deleted or archived.</p>
            <Link href="/topics/new" className="mt-2 inline-block text-sm text-primary hover:underline">
              Create a new topic
            </Link>
            <Link href="/topics" className="mt-4 block text-sm text-muted-foreground hover:underline">
              Back to topics
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!loading && fetchError) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen flex items-center justify-center">
          <div className="text-center px-6">
            <h1 className="text-xl font-semibold text-again">Could not load topic</h1>
            <p className="text-sm text-muted-foreground mt-2">{fetchError}</p>
            <button type="button" onClick={() => void topicQuery.refetch()} className="mt-4 text-sm text-primary hover:underline">
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
            <TopicDetailSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
          <Link
            href="/topics"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="size-4" />
            All Topics
          </Link>

          {topicStatus === "archived" && (
            <div className="mb-4 p-4 rounded-xl bg-hard/10 border border-hard/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm">This topic is archived. Restore it to include cards in review.</p>
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/me/topics/${topicId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "active" }),
                  });
                  refetchTopic();
                }}
                className="text-sm font-medium text-primary hover:underline shrink-0"
              >
                Restore topic
              </button>
            </div>
          )}

          {/* Header */}
          <div className="relative overflow-hidden rounded-3xl bg-surface border border-border/30 p-6 sm:p-8 mb-6">
            <div className="absolute -top-20 -right-20 size-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-surface-raised capitalize">{topicStatus}</span>
                  <span className="size-1 rounded-full bg-muted-foreground/50" />
                  <span>{cards.length} cards</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{topicName}</h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-xl">
                  {dueCount > 0 ? `${dueCount} cards due for review today.` : "You're caught up on reviews for this topic."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <StudyTimer
                  ref={timerRef}
                  defaultMinutes={25}
                  label="Topic sprint"
                  compact
                  storageKey={`recall.studyTimer.${topicId}`}
                  onRunningChange={setTimerRunning}
                />
                <button
                  onClick={() => timerRef.current?.pause()}
                  disabled={!timerRunning}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-border/40 rounded-xl hover:bg-surface-raised transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Pause className="size-4" />
                  Pause
                </button>
                <Link
                  href={`/review?topic=${topicId}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <PlayCircle className="size-4" />
                  {dueCount > 0 ? `Review ${dueCount} due` : `Review ${cards.length} cards`}
                </Link>
                <button
                  onClick={() => timerRef.current?.start()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-border/40 rounded-xl hover:bg-surface-raised transition-colors"
                >
                  <PlayCircle className="size-4" />
                  {timerRunning ? "Studying…" : "Start timer"}
                </button>
              </div>
            </div>

            {/* Overall progress */}
            <div className="relative mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <StatTile label="Overall progress" value={`${overall}%`} accent="primary" sub={totalTasks > 0 ? `${doneTasks}/${totalTasks} tasks` : "From mastery"} />
              <StatTile label="Mastery" value={`${avgRetention}%`} accent="good" sub="Avg retention" />
              <StatTile label="Due today" value={`${dueCount}`} accent="hard" sub="Cards" />
              <StatTile label="Streak" value={streakDays > 0 ? `${streakDays}d` : "—"} accent="accent" sub={streakDays > 0 ? "Keep it going" : "Start reviewing"} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-surface rounded-xl p-1 border border-border/20 mb-6 w-full sm:w-fit overflow-x-auto">
            {([
              { id: "roadmap", label: "Roadmap", icon: Flag },
              { id: "cards", label: "Cards", icon: BookOpen },
              { id: "insights", label: "AI Insights", icon: Sparkles },
            ] as const).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    tab === t.id ? "bg-surface-raised text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "roadmap" && (
            <RoadmapView
              topicSlug={topicId}
              roadmap={displayRoadmap}
              saving={roadmapSaving}
              onSaveRoadmap={saveRoadmap}
              onRegenerated={refetchTopic}
            />
          )}
          {tab === "cards" && (
            <CardsView
              topicSlug={topicId}
              topicName={topicName}
              cards={cards}
              weakCards={weakCards}
              performance={performance.length ? performance : [0]}
              onUpdated={refetchTopic}
            />
          )}
          {tab === "insights" && (
            <InsightsView
              topicSlug={topicId}
              topicName={topicName}
              mastery={avgRetention}
              dueCount={dueCount}
              onArchive={async () => {
                const res = await fetch(`/api/me/topics/${topicId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "archived" }),
                });
                if (!res.ok) throw new Error("Archive failed");
                invalidateTopicMutations(queryClient, topicId);
                window.location.href = "/topics";
              }}
              onDelete={async () => {
                if (!confirm(`Delete "${topicName}" and all ${cards.length} cards?`)) return;
                const res = await fetch(`/api/me/topics/${topicId}`, { method: "DELETE" });
                if (!res.ok) throw new Error("Delete failed");
                invalidateTopicMutations(queryClient, topicId);
                window.location.href = "/topics";
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "primary" | "good" | "hard" | "accent";
}) {
  const accentMap: Record<string, string> = {
    primary: "text-primary",
    good: "text-good",
    hard: "text-hard",
    accent: "text-accent",
  };
  return (
    <div className="rounded-2xl bg-surface-raised/60 border border-border/20 p-4">
      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold mt-1 ${accentMap[accent]}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function RoadmapView({
  topicSlug,
  roadmap,
  saving,
  onSaveRoadmap,
  onRegenerated,
}: {
  topicSlug: string;
  roadmap: Milestone[];
  saving: boolean;
  onSaveRoadmap: (next: Milestone[]) => Promise<void>;
  onRegenerated: () => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Learning Roadmap</h2>
            {regenError && <p className="text-xs text-again mt-1">{regenError}</p>}
          </div>
          <button
            type="button"
            disabled={regenerating}
            onClick={async () => {
              setRegenerating(true);
              setRegenError(null);
              try {
                const res = await fetch(`/api/me/topics/${topicSlug}/roadmap/regenerate`, { method: "POST" });
                if (!res.ok) {
                  const d = await res.json().catch(() => ({}));
                  throw new Error(d.error ?? "Regeneration failed");
                }
                onRegenerated();
              } catch (e) {
                setRegenError(e instanceof Error ? e.message : "Regeneration failed");
              } finally {
                setRegenerating(false);
              }
            }}
            className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Sparkles className={`size-3.5 ${regenerating ? "animate-pulse" : ""}`} />
            Regenerate with AI
          </button>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 sm:left-5 top-4 bottom-4 w-px bg-border/50" />

          <div className="space-y-4">
            {roadmap.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-12">No roadmap yet. Regenerate with AI to create one.</p>
            ) : (
              roadmap.map((m, i) => (
                <MilestoneCard
                  key={m.id}
                  milestone={m}
                  index={i + 1}
                  disabled={saving}
                  onToggleTask={(taskId, done) => {
                    const next = roadmap.map((ms) =>
                      ms.id !== m.id
                        ? ms
                        : {
                            ...ms,
                            tasks: (ms.tasks ?? []).map((t) =>
                              t.id === taskId ? { ...t, done } : t
                            ),
                          }
                    );
                    void onSaveRoadmap(next);
                  }}
                  onAddTask={(label) => {
                    const next = roadmap.map((ms) =>
                      ms.id !== m.id
                        ? ms
                        : {
                            ...ms,
                            tasks: [
                              ...(ms.tasks ?? []),
                              { id: `task-${Date.now()}`, label, done: false },
                            ],
                          }
                    );
                    void onSaveRoadmap(next);
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <section className="bg-surface rounded-2xl border border-border/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Current focus</h3>
          </div>
          {roadmap.find((m) => m.status === "active") ? (
            <>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {roadmap.find((m) => m.status === "active")?.title}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {roadmap.find((m) => m.status === "active")?.description || "Complete tasks in this milestone."}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active milestone. Regenerate or add tasks.</p>
          )}
        </section>

        <section className="bg-surface rounded-2xl border border-border/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="size-4 text-accent" />
            <h3 className="text-sm font-semibold">Completed milestones</h3>
          </div>
          <div className="space-y-2">
            {roadmap.filter((m) => m.status === "done").length === 0 ? (
              <p className="text-xs text-muted-foreground">None yet</p>
            ) : (
              roadmap
                .filter((m) => m.status === "done")
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-raised/60 text-sm">
                    <CheckCircle2 className="size-4 text-good" />
                    {m.title}
                  </div>
                ))
            )}
          </div>
        </section>

        <section className="bg-surface rounded-2xl border border-border/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="size-4 text-hard" />
            <h3 className="text-sm font-semibold">Quick actions</h3>
          </div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={`/review?topic=${topicSlug}`} className="flex gap-2 hover:text-primary">
                <ChevronRight className="size-4 mt-0.5 shrink-0" /> Review due cards
              </Link>
            </li>
            <li>
              <Link href={`/quiz?topic=${topicSlug}&count=5`} className="flex gap-2 hover:text-primary">
                <ChevronRight className="size-4 mt-0.5 shrink-0" /> Take a quiz
              </Link>
            </li>
            <li>
              <Link href="/schedule" className="flex gap-2 hover:text-primary">
                <ChevronRight className="size-4 mt-0.5 shrink-0" /> View schedule
              </Link>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}

function MilestoneCard({
  milestone,
  index,
  disabled,
  onToggleTask,
  onAddTask,
}: {
  milestone: Milestone;
  index: number;
  disabled?: boolean;
  onToggleTask: (taskId: string, done: boolean) => void;
  onAddTask: (label: string) => void;
}) {
  const [open, setOpen] = useState(milestone.status === "active");
  const [newTask, setNewTask] = useState("");
  const tasks = milestone.tasks ?? [];
  const statusStyles =
    milestone.status === "done"
      ? "bg-good/15 text-good border-good/30"
      : milestone.status === "active"
      ? "bg-primary/15 text-primary border-primary/30"
      : "bg-surface-raised text-muted-foreground border-border/30";

  return (
    <div className="relative pl-10 sm:pl-12">
      <div
        className={`absolute left-0 top-3 size-8 sm:size-10 rounded-full border flex items-center justify-center text-xs font-bold ${statusStyles}`}
      >
        {milestone.status === "done" ? <CheckCircle2 className="size-4 sm:size-5" /> : index}
      </div>

      <div className="rounded-2xl bg-surface border border-border/20 p-4 sm:p-5">
        <button onClick={() => setOpen(!open)} className="w-full text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base">{milestone.title}</h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider border ${statusStyles}`}>
                  {milestone.status}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{milestone.description}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-mono font-semibold">{milestone.progress}%</p>
              <p className="text-[10px] text-muted-foreground">{milestone.eta}</p>
            </div>
          </div>

          <div className="mt-3 h-1.5 bg-surface-raised rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                milestone.status === "done" ? "bg-good" : milestone.status === "active" ? "bg-primary" : "bg-muted-foreground/30"
              }`}
              style={{ width: `${milestone.progress}%` }}
            />
          </div>
        </button>

        {open && (
          <div className="mt-4 pt-4 border-t border-border/20 space-y-1.5">
            {tasks.map((task) => (
              <label
                key={task.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-raised/60 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  disabled={disabled}
                  onChange={(e) => onToggleTask(task.id, e.target.checked)}
                  className="sr-only"
                />
                {task.done ? (
                  <CheckCircle2 className="size-4 text-good shrink-0" />
                ) : (
                  <Circle className="size-4 text-muted-foreground shrink-0" />
                )}
                <span className={`text-sm flex-1 ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {task.label}
                </span>
              </label>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="New task…"
                className="flex-1 h-9 px-3 text-sm bg-surface rounded-lg border border-border/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTask.trim()) {
                    onAddTask(newTask.trim());
                    setNewTask("");
                  }
                }}
              />
              <button
                type="button"
                disabled={disabled || !newTask.trim()}
                onClick={() => {
                  if (newTask.trim()) {
                    onAddTask(newTask.trim());
                    setNewTask("");
                  }
                }}
                className="px-3 py-1.5 text-xs rounded-lg border border-border/40 hover:bg-surface-raised disabled:opacity-40"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CardsView({
  topicSlug,
  topicName,
  cards,
  weakCards,
  performance,
  onUpdated,
}: {
  topicSlug: string;
  topicName: string;
  cards: CardRow[];
  weakCards: CardRow[];
  performance: number[];
  onUpdated: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"manual" | "ai" | null>(null);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [aiNotes, setAiNotes] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<{ front: string; back: string }[]>([]);
  const [adding, setAdding] = useState(false);

  const startEdit = (card: CardRow) => {
    setEditingId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  const saveEdit = async (cardId: string) => {
    setActionError(null);
    const res = await fetch(`/api/me/topics/${topicSlug}/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front: editFront, back: editBack }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error ?? "Update failed");
      return;
    }
    setEditingId(null);
    onUpdated();
  };

  const deleteCard = async (cardId: string) => {
    if (!confirm("Delete this card?")) return;
    setActionError(null);
    const res = await fetch(`/api/me/topics/${topicSlug}/cards/${cardId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error ?? "Delete failed");
      return;
    }
    onUpdated();
  };

  const addCard = async (front: string, back: string) => {
    setAdding(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/me/topics/${topicSlug}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front, back }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Add failed");
      }
      setAddMode(null);
      setNewFront("");
      setNewBack("");
      setAiDrafts([]);
      onUpdated();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Add failed");
    } finally {
      setAdding(false);
    }
  };

  const generateAiCards = async () => {
    setAiGenerating(true);
    setActionError(null);
    try {
      const res = await fetch("/api/ai/cards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicName, description: aiNotes || topicName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setAiDrafts((data.cards ?? []).slice(0, 10));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <section className="bg-surface rounded-2xl border border-border/20 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">All Cards</h2>
            <span className="text-xs text-muted-foreground">Sorted by retention</span>
          </div>

          {actionError && <p className="text-xs text-again mb-3">{actionError}</p>}
          {cards.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <p>No cards yet.</p>
              <p className="mt-1">Add manually or generate with AI below.</p>
            </div>
          ) : (
          <div className="space-y-2">
            {cards
              .sort((a, b) => a.retention - b.retention)
              .map((card) => (
                <div
                  key={card.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl bg-surface-raised/50 hover:bg-surface-raised transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    {editingId === card.id ? (
                      <div className="space-y-2">
                        <input
                          value={editFront}
                          onChange={(e) => setEditFront(e.target.value)}
                          className="w-full h-9 px-3 bg-surface rounded-lg border border-border/20 text-sm"
                        />
                        <textarea
                          value={editBack}
                          onChange={(e) => setEditBack(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 bg-surface rounded-lg border border-border/20 text-sm resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void saveEdit(card.id)}
                            className="text-xs text-primary hover:underline"
                          >
                            Save
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-xs text-muted-foreground hover:underline">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium">{card.front}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="size-3" />{card.lastReviewed}</span>
                          <span className="flex items-center gap-1"><Calendar className="size-3" />Next: {card.nextReview}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    <div className="text-right min-w-[60px]">
                      <p
                        className={`text-sm font-mono font-bold ${
                          card.retention >= 80 ? "text-good" : card.retention >= 60 ? "text-hard" : "text-again"
                        }`}
                      >
                        {card.retention}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">retention</p>
                    </div>
                    {editingId !== card.id && (
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEdit(card)}
                          className="size-7 flex items-center justify-center rounded-lg hover:bg-surface transition-colors"
                        >
                          <Edit3 className="size-3.5 text-muted-foreground" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteCard(card.id)}
                          className="size-7 flex items-center justify-center rounded-lg hover:bg-surface transition-colors"
                        >
                          <Trash2 className="size-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
          )}
        </section>

        <section className="bg-surface rounded-2xl border border-border/20 p-5 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Add More Cards</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAddMode("manual")}
              className="flex items-center gap-3 p-4 rounded-xl bg-surface-raised hover:bg-surface transition-colors text-left"
            >
              <Plus className="size-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Manual entry</p>
                <p className="text-xs text-muted-foreground">Add cards one by one</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setAddMode("ai")}
              className="flex items-center gap-3 p-4 rounded-xl bg-surface-raised hover:bg-surface transition-colors text-left"
            >
              <BrainCircuit className="size-5 text-primary" />
              <div>
                <p className="font-medium text-sm">AI generation</p>
                <p className="text-xs text-muted-foreground">Generate from notes</p>
              </div>
            </button>
          </div>

          {addMode === "manual" && (
            <div className="mt-4 p-4 rounded-xl border border-border/20 space-y-3">
              <input
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                placeholder="Question"
                className="w-full h-10 px-3 bg-surface rounded-lg border border-border/20 text-sm"
              />
              <textarea
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                placeholder="Answer"
                rows={3}
                className="w-full px-3 py-2 bg-surface rounded-lg border border-border/20 text-sm resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={adding || !newFront.trim()}
                  onClick={() => void addCard(newFront.trim(), newBack.trim())}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-40"
                >
                  Add card
                </button>
                <button type="button" onClick={() => setAddMode(null)} className="px-4 py-2 text-sm border border-border/40 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {addMode === "ai" && (
            <div className="mt-4 p-4 rounded-xl border border-border/20 space-y-3">
              <textarea
                value={aiNotes}
                onChange={(e) => setAiNotes(e.target.value)}
                placeholder="Notes or topics to generate cards from…"
                rows={3}
                className="w-full px-3 py-2 bg-surface rounded-lg border border-border/20 text-sm resize-none"
              />
              <button
                type="button"
                disabled={aiGenerating}
                onClick={() => void generateAiCards()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-40"
              >
                {aiGenerating ? "Generating…" : "Generate preview"}
              </button>
              {aiDrafts.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {aiDrafts.map((c, i) => (
                    <div key={i} className="p-3 rounded-lg bg-surface-raised text-sm flex justify-between gap-2">
                      <div>
                        <p className="font-medium">{c.front}</p>
                        <p className="text-muted-foreground text-xs mt-1">{c.back}</p>
                      </div>
                      <button
                        type="button"
                        disabled={adding}
                        onClick={() => void addCard(c.front, c.back)}
                        className="text-xs text-primary hover:underline shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => { setAddMode(null); setAiDrafts([]); }} className="text-sm text-muted-foreground hover:underline">
                Close
              </button>
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="bg-surface rounded-2xl border border-border/20 p-5">
          <h3 className="text-sm font-semibold mb-4">Accuracy trend</h3>
          <div className="flex items-end gap-[3px] h-28">
            {performance.map((p, i) => (
              <div key={i} className="flex-1 flex items-end">
                <div className="w-full bg-primary/60 rounded-t-sm" style={{ height: `${p}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border/20">
            <span className="text-xs text-muted-foreground">Current retention by card</span>
          </div>
        </section>

        <section className="bg-surface rounded-2xl border border-border/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="size-4 text-again" />
            <h3 className="text-sm font-semibold">Needs attention</h3>
          </div>
          <div className="space-y-2">
            {weakCards.length === 0 ? (
              <p className="text-xs text-muted-foreground">No weak cards</p>
            ) : (
              weakCards.map((c) => (
                <Link
                  key={c.id}
                  href={`/review?topic=${topicSlug}`}
                  className="block text-xs p-2.5 rounded-lg bg-again/10 border border-again/20 hover:bg-again/15"
                >
                  <p className="text-foreground/90 line-clamp-2">{c.front}</p>
                  <p className="text-again mt-1 font-mono">{c.retention}% retention</p>
                </Link>
              ))
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

type TopicInsightsPayload = {
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  actions?: string[];
};

const INSIGHTS_CACHE_KEY = (slug: string) => `recall.insights.${slug}`;

function InsightsView({
  topicSlug,
  topicName,
  mastery,
  dueCount,
  onArchive,
  onDelete,
}: {
  topicSlug: string;
  topicName: string;
  mastery: number;
  dueCount: number;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [data, setData] = useState<TopicInsightsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mgmtError, setMgmtError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(INSIGHTS_CACHE_KEY(topicSlug));
      if (raw) setData(JSON.parse(raw) as TopicInsightsPayload);
    } catch {
      setData(null);
    }
  }, [topicSlug]);

  const regenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/topics/${topicSlug}/insights/regenerate`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Failed to generate insights");
      }
      const d = (await res.json()) as TopicInsightsPayload;
      setData(d);
      localStorage.setItem(INSIGHTS_CACHE_KEY(topicSlug), JSON.stringify(d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary ?? null;
  const strengths = data?.strengths ?? [];
  const weaknesses = data?.weaknesses ?? [];
  const actions = data?.actions ?? [];

  const defaultActions = [
    { href: `/review?topic=${topicSlug}`, icon: PlayCircle, label: dueCount > 0 ? `Review ${dueCount} due cards` : "Study ahead with review", time: "10 min" },
    { href: `/quiz?topic=${topicSlug}&count=5`, icon: BrainCircuit, label: "Take a 5-question quiz", time: "5 min" },
    { href: "/schedule", icon: Calendar, label: "View your study schedule", time: "1 min" },
  ];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <section className="relative overflow-hidden bg-surface rounded-2xl border border-border/20 p-5 sm:p-6">
          <div className="absolute -top-10 -right-10 size-40 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent" />
                <h2 className="text-lg font-semibold">AI Summary</h2>
              </div>
              <button
                type="button"
                onClick={() => void regenerate()}
                disabled={loading}
                className="text-xs text-primary hover:text-primary/80 disabled:opacity-50"
              >
                {loading ? "Generating…" : data ? "Regenerate" : "Generate insights"}
              </button>
            </div>
            {error && <p className="text-xs text-again mb-2">{error}</p>}
            <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
              {loading
                ? "Generating insights…"
                : summary ??
                  `Generate AI insights for ${topicName} based on your cards and review history.`}
            </p>
            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              {strengths[0] && (
                <Insight icon={Zap} title="Strength" body={strengths[0]} tone="good" />
              )}
              {weaknesses[0] && (
                <Insight icon={AlertCircle} title="Weakness" body={weaknesses[0]} tone="again" />
              )}
              {(actions[0] ?? strengths[1]) && (
                <Insight
                  icon={Target}
                  title="Next Win"
                  body={actions[0] ?? strengths[1] ?? "Keep reviewing"}
                  tone="primary"
                />
              )}
            </div>
          </div>
        </section>

        <section className="bg-surface rounded-2xl border border-border/20 p-5 sm:p-6">
          <h3 className="text-lg font-semibold mb-4">Recommended actions</h3>
          <div className="space-y-2">
            {(actions.length > 0
              ? actions.map((label) => ({ href: `/review?topic=${topicSlug}`, icon: PlayCircle, label, time: "—" }))
              : defaultActions
            ).map((a, i) => {
              const Icon = a.icon;
              return (
                <Link
                  key={i}
                  href={a.href}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-raised/60 hover:bg-surface-raised transition-colors text-left"
                >
                  <div className="size-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="bg-surface rounded-2xl border border-border/20 p-5">
          <h3 className="text-sm font-semibold mb-3">Mastery</h3>
          <div className="text-4xl font-bold text-good">{mastery}%</div>
          <p className="text-xs text-muted-foreground mt-1">Average card retention</p>
          <div className="mt-4 h-2 bg-surface-raised rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-good" style={{ width: `${mastery}%` }} />
          </div>
          {dueCount > 0 && (
            <p className="text-xs text-hard mt-3">{dueCount} cards due for review</p>
          )}
        </section>

        <section className="bg-surface rounded-2xl border border-border/20 p-5">
          <h3 className="text-sm font-semibold mb-3">Management</h3>
          {mgmtError && <p className="text-xs text-again mb-2">{mgmtError}</p>}
          <div className="space-y-1">
            <button
              onClick={async () => {
                try {
                  await onArchive();
                } catch (e) {
                  setMgmtError(e instanceof Error ? e.message : "Archive failed");
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
            >
              <Pause className="size-4" /> Archive topic
            </button>
            <button
              onClick={async () => {
                try {
                  await onDelete();
                } catch (e) {
                  setMgmtError(e instanceof Error ? e.message : "Delete failed");
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-again hover:bg-surface-raised transition-colors"
            >
              <Trash2 className="size-4" /> Delete topic
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}

function Insight({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: typeof Zap;
  title: string;
  body: string;
  tone: "good" | "again" | "primary";
}) {
  const toneMap: Record<string, string> = {
    good: "text-good bg-good/10 border-good/20",
    again: "text-again bg-again/10 border-again/20",
    primary: "text-primary bg-primary/10 border-primary/20",
  };
  return (
    <div className={`rounded-xl border p-3 ${toneMap[tone]}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
        <Icon className="size-3.5" />
        {title}
      </div>
      <p className="text-sm text-foreground/90 mt-1.5">{body}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
